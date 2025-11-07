"use client";

import { useRef, useState } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Clock, Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface UploadPageProps {
	accept?: string;
	onFileSelected?: (file: File | null) => void;
}

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);
	const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
	return `${formattedSize} ${sizes[i]}`;
};

export default function UploadPage({
	accept,
	onFileSelected,
}: UploadPageProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [expiresOption, setExpiresOption] = useState("7d");
	const [selectedDomain, setSelectedDomain] = useState("example.com");

	const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			setSelectedFile(file);
			onFileSelected?.(file);
		} else {
			setSelectedFile(null);
			onFileSelected?.(null);
		}

		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const handleSelectFile = () => {
		if (inputRef.current) {
			inputRef.current.click();
		}
	};

	return (
		<div className="w-full max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				accept={accept}
				onChange={handleFileInput}
			/>

			<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col w-full md:w-auto">
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
						<Clock className="h-4 w-4" />
						<span>Expires</span>
					</div>
					<Tabs
						defaultValue="7d"
						value={expiresOption}
						onValueChange={setExpiresOption}
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
					<Select value={selectedDomain} onValueChange={setSelectedDomain}>
						<SelectTrigger className="w-full sm:w-48 md:w-64">
							<SelectValue placeholder="Select domain" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="example.com">example.com</SelectItem>
							<SelectItem value="cdn.example.com">cdn.example.com</SelectItem>
							<SelectItem value="files.example.com">
								files.example.com
							</SelectItem>
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
							disabled={!!selectedFile}
							className="w-full border-2 border-dashed border-input rounded-2xl p-16 sm:p-20 md:p-24 text-center cursor-pointer select-none bg-transparent duration-300 hover:bg-accent/50 h-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
											Maximum file size: 500MB
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
							</>
						) : (
							<ContextMenuItem onClick={handleSelectFile}>
								Select file
							</ContextMenuItem>
						)}
					</ContextMenuContent>
				</ContextMenu>
			</div>
		</div>
	);
}
