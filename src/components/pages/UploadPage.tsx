"use client";

import { useRef, useState, useEffect } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Clock, Globe, Copy, Check, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type {
	ExpiresOption,
	StartUploadResponse,
	UploadResponse,
	DomainOption,
} from "@/types/uploads";
import { CHUNK_SIZE, DIRECT_UPLOAD_LIMIT } from "@/types/uploads";
import { getDomains, refreshDomains } from "@/lib/domains";

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);
	const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
	return `${formattedSize} ${sizes[i]}`;
};

export default function UploadPage() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadUrl, setUploadUrl] = useState("");
	const [copied, setCopied] = useState(false);
	const [selectedDomain, setSelectedDomain] = useState("");
	const [selectedExpires, setSelectedExpires] = useState<ExpiresOption>("1h");
	const [domains, setDomains] = useState<DomainOption[]>([]);
	const [isLoadingDomains, setIsLoadingDomains] = useState(true);
	const [isRefreshingDomains, setIsRefreshingDomains] = useState(false);
	const [refreshSuccess, setRefreshSuccess] = useState(false);

	useEffect(() => {
		const loadDomains = async () => {
			try {
				const data = await getDomains();
				setDomains(data);
				if (data.length > 0 && !selectedDomain) {
					const hallaxiusDomain = data.find((d) => d.value === "hallaxi.us");
					if (hallaxiusDomain) {
						setSelectedDomain(hallaxiusDomain.value);
					} else {
						setSelectedDomain(data[0].value);
					}
				}
			} catch (error) {
				console.error("Error loading domains:", error);
				toast.error("Failed to load domains", {
					description: "Using default domain configuration",
				});
			} finally {
				setIsLoadingDomains(false);
			}
		};

		loadDomains();
	}, [selectedDomain]);

	const handleDirectUpload = async (file: File) => {
		try {
			console.log("[Frontend] Direct upload params:", {
				filename: file.name,
				filesize: file.size,
				mimeType: file.type,
				domain: selectedDomain,
				expires: selectedExpires,
			});

			const params = new URLSearchParams({
				filename: file.name,
				filesize: file.size.toString(),
				mimeType: file.type,
				domain: selectedDomain || "",
				expires: selectedExpires,
			});

			const response = await fetch(`/api/upload/direct?${params}`, {
				method: "POST",
				body: file,
			});

			if (!response.ok) {
				const error = (await response.json()) as { error?: string };
				throw new Error(error.error || "Upload failed");
			}

			const result: UploadResponse = await response.json();
			setUploadUrl(result.url);
			setSelectedFile(null);
			toast.success("Upload complete!", {
				description: `File uploaded successfully`,
			});
		} catch (error) {
			console.error("Direct upload error:", error);
			toast.error("Upload failed", {
				description:
					error instanceof Error ? error.message : "Unknown error occurred",
			});
			throw error;
		}
	};

	const handleChunkedUpload = async (file: File) => {
		try {
			console.log("[Frontend] Chunked upload start params:", {
				filename: file.name,
				filesize: file.size,
				mimeType: file.type,
				domain: selectedDomain,
				expires: selectedExpires,
			});

			const startResponse = await fetch("/api/upload/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					filename: file.name,
					filesize: file.size,
					mimeType: file.type,
					domain: selectedDomain,
					expires: selectedExpires,
				}),
			});

			if (!startResponse.ok) {
				const error = (await startResponse.json()) as { error?: string };
				throw new Error(error.error || "Failed to start upload");
			}

			const startData: StartUploadResponse = await startResponse.json();
			const { uploadId, slug, totalChunks } = startData;

			const uploadedParts: Array<{ partNumber: number; etag: string }> = [];
			let uploadedChunks = 0;

			const maxConcurrentUploads = 3; // IN CASE OF ERRORS, CHANGE TO 2

			const uploadChunk = async (chunkIndex: number): Promise<void> => {
				const start = chunkIndex * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				let retryCount = 0;
				const maxRetries = 3;

				console.log(
					`[Chunk ${chunkIndex + 1}/${totalChunks}] Starting upload (${formatBytes(chunk.size)})`,
				);

				while (retryCount < maxRetries) {
					try {
						const chunkParams = new URLSearchParams({
							uploadId,
							chunkIndex: chunkIndex.toString(),
							totalChunks: totalChunks.toString(),
						});

						const chunkResponse = await fetch(
							`/api/upload/chunk?${chunkParams}`,
							{
								method: "POST",
								body: chunk,
							},
						);

						if (!chunkResponse.ok) {
							throw new Error(`Failed to upload chunk ${chunkIndex}`);
						}

						const chunkData = (await chunkResponse.json()) as {
							uploadedPart?: { partNumber: number; etag: string };
						};
						if (chunkData.uploadedPart) {
							uploadedParts.push(chunkData.uploadedPart);
						}

						uploadedChunks++;
						setUploadProgress(Math.round((uploadedChunks / totalChunks) * 100));
						console.log(`[Chunk ${chunkIndex + 1}/${totalChunks}] ✅ Success`);
						return;
					} catch (error) {
						retryCount++;
						console.error(
							`[Chunk ${chunkIndex + 1}/${totalChunks}] ❌ Attempt ${retryCount}/${maxRetries} failed:`,
							error,
						);
						if (retryCount >= maxRetries) {
							throw new Error(
								`Failed to upload chunk ${chunkIndex} after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
							);
						}
						await new Promise((resolve) =>
							setTimeout(resolve, 2000 * Math.pow(2, retryCount - 1)),
						);
					}
				}
			};

			console.log(
				`[Upload] Starting batched upload: ${totalChunks} chunks, ${maxConcurrentUploads} concurrent`,
			);
			for (let i = 0; i < totalChunks; i += maxConcurrentUploads) {
				const batchPromises: Promise<void>[] = [];
				const batchSize = Math.min(i + maxConcurrentUploads, totalChunks) - i;

				console.log(
					`[Batch ${Math.floor(i / maxConcurrentUploads) + 1}] Processing chunks ${i + 1}-${i + batchSize}`,
				);

				for (
					let j = i;
					j < Math.min(i + maxConcurrentUploads, totalChunks);
					j++
				) {
					batchPromises.push(uploadChunk(j));
				}

				await Promise.all(batchPromises);
				console.log(
					`[Batch ${Math.floor(i / maxConcurrentUploads) + 1}] ✅ Completed`,
				);
			}
			console.log(`[Upload] All chunks uploaded successfully`);

			console.log("[Frontend] Chunked upload complete params:", {
				uploadId,
				slug,
				filename: file.name,
				filesize: file.size,
				mimeType: file.type,
				domain: selectedDomain,
				expires: selectedExpires,
				totalChunks,
				uploadedPartsCount: uploadedParts.length,
			});

			const completeResponse = await fetch("/api/upload/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					uploadId,
					slug,
					filename: file.name,
					filesize: file.size,
					mimeType: file.type,
					domain: selectedDomain,
					expires: selectedExpires,
					totalChunks,
					uploadedParts,
				}),
			});

			if (!completeResponse.ok) {
				const error = (await completeResponse.json()) as { error?: string };
				throw new Error(error.error || "Failed to complete upload");
			}

			const result: UploadResponse = await completeResponse.json();
			setUploadUrl(result.url);
			setSelectedFile(null);
			toast.success("Upload complete!", {
				description: `File uploaded successfully`,
			});
		} catch (error) {
			console.error("Chunked upload error:", error);
			toast.error("Upload failed", {
				description:
					error instanceof Error ? error.message : "Unknown error occurred",
			});
			throw error;
		}
	};

	const handleUpload = async (file: File) => {
		setIsUploading(true);
		setUploadProgress(0);

		try {
			if (file.size <= DIRECT_UPLOAD_LIMIT) {
				await handleDirectUpload(file);
				setUploadProgress(100);
			} else {
				await handleChunkedUpload(file);
			}
		} catch (error) {
		} finally {
			setIsUploading(false);
		}
	};

	const handleSelectFile = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	};

	const handleFileInput = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			const file = files[0];

			if (file.size > 512 * 1024 * 1024) {
				toast.error("File too large", {
					description: "Maximum file size is 512MB",
				});
				return;
			}

			setSelectedFile(file);
			setUploadUrl("");
			await handleUpload(file);
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClearFile = () => {
		setSelectedFile(null);
		setUploadUrl("");
	};

	const handleCopyUrl = () => {
		if (uploadUrl) {
			navigator.clipboard.writeText(uploadUrl);
			setCopied(true);
			toast.success("URL copied!", {
				description: "Link copied to clipboard",
			});

			setTimeout(() => {
				setCopied(false);
			}, 2000);
		}
	};

	const handleRefreshDomains = async () => {
		if (isRefreshingDomains) return;

		setIsRefreshingDomains(true);
		setRefreshSuccess(false);

		try {
			const data = await refreshDomains();
			setDomains(data);
			const selectedStillExists = data.some((d) => d.value === selectedDomain);
			if (!selectedStillExists && data.length > 0) {
				setSelectedDomain(data[0].value);
			}
			toast.success("Domains refreshed!", {
				description: `Found ${data.length} domain${data.length !== 1 ? "s" : ""}`,
			});
			setRefreshSuccess(true);
			setTimeout(() => {
				setRefreshSuccess(false);
			}, 2000);
			setTimeout(() => {
				setIsRefreshingDomains(false);
			}, 6000);
		} catch (error) {
			console.error("Error refreshing domains:", error);
			toast.error("Failed to refresh domains", {
				description:
					error instanceof Error ? error.message : "Please try again later",
			});
			setTimeout(() => {
				setIsRefreshingDomains(false);
			}, 6000);
		}
	};

	return (
		<div className="w-full max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				onChange={handleFileInput}
			/>

			<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col w-full md:w-auto">
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
						<Clock className="h-4 w-4" />
						<span>Expires</span>
					</div>
					<Tabs
						value={selectedExpires}
						onValueChange={(value) =>
							setSelectedExpires(value as ExpiresOption)
						}
						className="w-full max-w-[400px]"
					>
						<TabsList className="w-full">
							<TabsTrigger value="1h" className="flex-1">
								1h
							</TabsTrigger>
							<TabsTrigger value="1d" className="flex-1">
								1d
							</TabsTrigger>
							<TabsTrigger value="7d" className="flex-1">
								7d
							</TabsTrigger>
							<TabsTrigger value="30d" className="flex-1">
								30d
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				<div className="flex flex-col w-full md:w-auto">
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
						<Globe className="h-4 w-4" />
						<span>Domain</span>
					</div>
					<div className="flex gap-2">
						<Select
							value={selectedDomain}
							onValueChange={setSelectedDomain}
							disabled={isLoadingDomains || domains.length === 0}
						>
							<SelectTrigger className="w-full sm:w-48 md:w-64">
								<SelectValue
									placeholder={
										isLoadingDomains
											? "Loading domains..."
											: domains.length === 0
												? "No domains available"
												: "Select domain"
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{domains.length === 0 ? (
									<div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
										No domains available
									</div>
								) : (
									domains.map((domain) => (
										<SelectItem key={domain.id} value={domain.value}>
											{domain.label}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
						<Button
							onClick={handleRefreshDomains}
							disabled={isRefreshingDomains || isLoadingDomains}
							size="icon"
							variant="outline"
							className="shrink-0 relative cursor-pointer"
						>
							<RefreshCw
								className={`h-4 w-4 absolute transition-all duration-300 ${
									refreshSuccess
										? "opacity-0 scale-0 rotate-90"
										: isRefreshingDomains
											? "animate-spin opacity-100 scale-100"
											: "opacity-100 scale-100 rotate-0"
								}`}
							/>
							<Check
								className={`h-4 w-4 absolute transition-all duration-300 ${
									refreshSuccess
										? "opacity-100 scale-100 rotate-0"
										: "opacity-0 scale-0 -rotate-90"
								}`}
							/>
						</Button>
					</div>
				</div>
			</div>

			<div className="w-full max-w-full overflow-hidden">
				<ContextMenu>
					<ContextMenuTrigger>
						<Button
							type="button"
							onClick={handleSelectFile}
							className="w-full border-2 border-dashed border-input rounded-2xl p-16 sm:p-20 md:p-24 text-center cursor-pointer select-none bg-transparent duration-300 hover:bg-accent/50 h-auto disabled:opacity-50 disabled:hover:bg-transparent"
						>
							<div className="flex flex-col items-center gap-3 w-full">
								{selectedFile ? (
									<>
										<span className="text-base sm:text-lg md:text-xl font-medium text-foreground max-w-full line-clamp-2 wrap-break-word px-2">
											{selectedFile.name}
										</span>
										<span className="text-sm sm:text-base text-muted-foreground">
											{formatBytes(selectedFile.size)}
										</span>
									</>
								) : (
									<>
										<span className="text-base sm:text-lg md:text-xl font-medium text-foreground">
											Click here to select a file
										</span>
										<span className="text-sm sm:text-base text-muted-foreground">
											Maximum file size: 512MB
										</span>
									</>
								)}
							</div>
						</Button>
					</ContextMenuTrigger>

					<ContextMenuContent className="w-80">
						{selectedFile ? (
							<>
								<div className="px-2 py-1.5 border-b border-input">
									<div className="flex items-start space-x-2">
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-foreground truncate">
												{selectedFile.name}
											</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{formatBytes(selectedFile.size)} •{" "}
												{selectedFile.type || "Unknown type"}
											</p>
										</div>
									</div>
								</div>
								<ContextMenuItem onClick={handleClearFile}>
									Clear file
								</ContextMenuItem>
							</>
						) : (
							<ContextMenuItem onClick={handleSelectFile}>
								Select file
							</ContextMenuItem>
						)}
					</ContextMenuContent>
				</ContextMenu>
			</div>

			{isUploading && (
				<div className="mt-6">
					<div className="relative">
						<div className="flex justify-end mb-1">
							<p className="text-sm text-muted-foreground">{uploadProgress}%</p>
						</div>
						<Progress value={uploadProgress} className="h-2" />
					</div>
				</div>
			)}

			{uploadUrl && (
				<div className="mt-6">
					<div className="flex gap-2">
						<Input value={uploadUrl} readOnly className="flex-1" />
						<Button
							onClick={handleCopyUrl}
							size="icon"
							className="relative cursor-pointer"
						>
							<Copy
								className={`h-4 w-4 absolute transition-all duration-300 ${
									copied
										? "opacity-0 scale-0 rotate-90"
										: "opacity-100 scale-100 rotate-0"
								}`}
							/>
							<Check
								className={`h-4 w-4 absolute transition-all duration-300 ${
									copied
										? "opacity-100 scale-100 rotate-0"
										: "opacity-0 scale-0 -rotate-90"
								}`}
							/>
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
