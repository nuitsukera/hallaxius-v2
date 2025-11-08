"use client";

import { useRef, useState } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Clock, Globe, Upload, Copy, Check } from "lucide-react";
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
} from "@/types/uploads";
import { CHUNK_SIZE, DIRECT_UPLOAD_LIMIT } from "@/types/uploads";

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
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [expiresOption, setExpiresOption] = useState<ExpiresOption>("7d");
	const [selectedDomain, setSelectedDomain] = useState("hallaxi.us");
	const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	/**
	 * Upload direto para arquivos pequenos (até 10MB)
	 */
	const handleDirectUpload = async (file: File) => {
		try {
			const params = new URLSearchParams({
				filename: file.name,
				filesize: file.size.toString(),
				mimeType: file.type,
				domain: selectedDomain,
				expires: expiresOption,
			});

			const response = await fetch(`/api/upload/direct?${params}`, {
				method: "POST",
				body: file,
			});

			if (!response.ok) {
				const error = await response.json() as { error?: string };
				throw new Error(error.error || "Upload failed");
			}

			const result: UploadResponse = await response.json();
			setUploadedUrl(result.url);
			setSelectedFile(null); // Limpar arquivo após upload bem-sucedido
			toast.success("Upload complete!", {
				description: `File uploaded successfully to ${result.url}`,
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

	/**
	 * Upload chunked para arquivos grandes (acima de 10MB)
	 */
	const handleChunkedUpload = async (file: File) => {
		try {
			// 1. Iniciar upload
			const startResponse = await fetch("/api/upload/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					filename: file.name,
					filesize: file.size,
					mimeType: file.type,
					domain: selectedDomain,
					expires: expiresOption,
				}),
			});

			if (!startResponse.ok) {
				const error = await startResponse.json() as { error?: string };
				throw new Error(error.error || "Failed to start upload");
			}

			const startData: StartUploadResponse = await startResponse.json();
			const { uploadId, slug, totalChunks } = startData;

			// 2. Dividir arquivo em chunks e enviar
			let uploadedChunks = 0;

			for (let i = 0; i < totalChunks; i++) {
				const start = i * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				// Enviar chunk com retry
				let retryCount = 0;
				const maxRetries = 3;

				while (retryCount < maxRetries) {
					try {
						const chunkParams = new URLSearchParams({
							uploadId,
							chunkIndex: i.toString(),
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
							throw new Error(`Failed to upload chunk ${i}`);
						}

						uploadedChunks++;
						setUploadProgress(Math.round((uploadedChunks / totalChunks) * 100));
						break;
					} catch (error) {
						retryCount++;
						if (retryCount >= maxRetries) {
							throw new Error(`Failed to upload chunk ${i} after ${maxRetries} attempts`);
						}
						// Aguardar antes de tentar novamente
						await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
					}
				}
			}

			// 3. Completar upload
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
					expires: expiresOption,
					totalChunks,
				}),
			});

			if (!completeResponse.ok) {
				const error = await completeResponse.json() as { error?: string };
				throw new Error(error.error || "Failed to complete upload");
			}

			const result: UploadResponse = await completeResponse.json();
			setUploadedUrl(result.url);
			setSelectedFile(null); // Limpar arquivo após upload bem-sucedido
			toast.success("Upload complete!", {
				description: `File uploaded successfully to ${result.url}`,
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

	/**
	 * Iniciar upload (detecta automaticamente o tipo)
	 */
	const handleUpload = async (file: File) => {
		setIsUploading(true);
		setUploadProgress(0);

		try {
			if (file.size <= DIRECT_UPLOAD_LIMIT) {
				// Upload direto para arquivos pequenos
				await handleDirectUpload(file);
				setUploadProgress(100);
			} else {
				// Upload chunked para arquivos grandes
				await handleChunkedUpload(file);
			}
		} catch (error) {
			// Erro já tratado nas funções acima
		} finally {
			setIsUploading(false);
		}
	};

	const handleSelectFile = () => {
		if (inputRef.current) {
			inputRef.current.click();
		}
	};

	const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
			setUploadedUrl(null);
			
			// Iniciar upload automaticamente
			await handleUpload(file);
		}

		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const handleClearFile = () => {
		setSelectedFile(null);
		setUploadedUrl(null);
	};

	const handleCopyUrl = () => {
		if (uploadedUrl) {
			navigator.clipboard.writeText(uploadedUrl);
			setIsCopied(true);
			toast.success("URL copied!", {
				description: "Link copied to clipboard",
			});

			setTimeout(() => {
				setIsCopied(false);
			}, 2000);
		}
	};

	return (
		<div className="w-full max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				onChange={handleFileInput}
				// Upload desativado, mas select ainda pode ser aberto
			/>

			<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col w-full md:w-auto">
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
						<Clock className="h-4 w-4" />
						<span>Expires</span>
					</div>
					<Tabs
						value={expiresOption}
						onValueChange={(value) => setExpiresOption(value as ExpiresOption)}
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
							<TabsTrigger
								value="30d"
								className="flex-1"
							>
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
					<Select
						value={selectedDomain}
						onValueChange={setSelectedDomain}
					>
						<SelectTrigger className="w-full sm:w-48 md:w-64">
							<SelectValue placeholder="Select domain" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="hallaxi.us">hallaxi.us</SelectItem>
							<SelectItem value="cdn.hallaxi.us">cdn.hallaxi.us</SelectItem>
							<SelectItem value="files.hallaxi.us">files.hallaxi.us</SelectItem>
						</SelectContent>
					</Select>
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
							<p className="text-sm text-muted-foreground">
								{uploadProgress}%
							</p>
						</div>
						<Progress value={uploadProgress} className="h-2" />
					</div>
				</div>
			)}

			{uploadedUrl && (
				<div className="mt-6">
					<div className="flex gap-2">
						<Input value={uploadedUrl} readOnly className="flex-1" />
						<Button
							onClick={handleCopyUrl}
							size="icon"
							className="relative cursor-pointer"
						>
							<Copy
								className={`h-4 w-4 absolute transition-all duration-300 ${
									isCopied
										? "opacity-0 scale-0 rotate-90"
										: "opacity-100 scale-100 rotate-0"
								}`}
							/>
							<Check
								className={`h-4 w-4 absolute transition-all duration-300 ${
									isCopied
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