"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Music, FileText, File, Archive, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileViewPageProps {
	filename: string;
	fileUrl: string;
	mimeType: string;
	filesize: number;
	uploadAt: Date;
	expiresAt: Date;
}

interface ImageDimensions {
	width: number;
	height: number;
	aspectRatio: string;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);
	const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
	return `${formattedSize} ${sizes[i]}`;
}

function formatDate(date: Date): string {
	const time = new Intl.DateTimeFormat("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);

	const dateStr = new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);

	return `${time} - ${dateStr}`;
}

function getFileType(mimeType: string): string {
	if (mimeType.startsWith("image/")) return "IMAGE";
	if (mimeType.startsWith("video/")) return "VIDEO";
	if (mimeType.startsWith("audio/")) return "AUDIO";
	if (mimeType.startsWith("text/")) return "TEXT";
	if (
		mimeType.includes("pdf") ||
		mimeType.includes("document") ||
		mimeType.includes("word") ||
		mimeType.includes("excel") ||
		mimeType.includes("powerpoint")
	)
		return "DOCUMENT";
	if (
		mimeType.includes("zip") ||
		mimeType.includes("rar") ||
		mimeType.includes("7z") ||
		mimeType.includes("tar") ||
		mimeType.includes("gz")
	)
		return "ARCHIVE";
	return "DOCUMENT";
}

function getAspectRatioClass(ratio: number): string {
	if (Math.abs(ratio - 1) < 0.1) return "aspect-square";
	if (Math.abs(ratio - 4 / 3) < 0.1) return "aspect-[4/3]";
	if (Math.abs(ratio - 16 / 9) < 0.15) return "aspect-video";
	if (Math.abs(ratio - 21 / 9) < 0.15) return "aspect-[21/9]";
	if (Math.abs(ratio - 3 / 4) < 0.1) return "aspect-[3/4]";
	if (Math.abs(ratio - 9 / 16) < 0.1) return "aspect-[9/16]";
	if (Math.abs(ratio - 2 / 1) < 0.1) return "aspect-[2/1]";
	if (Math.abs(ratio - 5 / 4) < 0.1) return "aspect-[5/4]";

	return "";
}

export default function FileViewPage({
	filename,
	fileUrl,
	mimeType,
	filesize,
	uploadAt,
	expiresAt,
}: FileViewPageProps) {
	const fileType = getFileType(mimeType);
	const [imageDimensions, setImageDimensions] =
		useState<ImageDimensions | null>(null);

	useEffect(() => {
		if (fileType === "IMAGE") {
			const img = document.createElement("img");
			img.src = fileUrl;
			img.onload = () => {
				const ratio = img.naturalWidth / img.naturalHeight;
				setImageDimensions({
					width: img.naturalWidth,
					height: img.naturalHeight,
					aspectRatio: getAspectRatioClass(ratio),
				});
			};
		}
	}, [fileUrl, fileType]);

	const handleDownload = () => {
		const slug = window.location.pathname.split("/").filter(Boolean)[0];

		const downloadUrl = `/api/download/${slug}`;

		const link = document.createElement("a");
		link.href = downloadUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success("Download started!", {
			description: "Your file is being downloaded",
		});
	};

	const aspectRatioClass = imageDimensions?.aspectRatio || "aspect-video";
	const maxWidthClass = "max-w-7xl";

	return (
		<div className="min-h-screen flex items-center justify-center py-8 px-4">
			<Card className={`w-full ${maxWidthClass}`}>
				<div className="flex flex-col lg:flex-row">
					<div
						className={`relative w-full lg:w-3/5 overflow-hidden rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg lg:border-r border-border ${fileType === "IMAGE" && imageDimensions ? aspectRatioClass : ""}`}
					>
						{(() => {
							switch (fileType) {
								case "VIDEO":
									return (
										<video
											src={fileUrl}
											controls
											className="w-full h-auto rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg"
											autoPlay
											playsInline
										/>
									);
								case "AUDIO":
									return (
										<div className="flex w-full flex-col items-center justify-center gap-4 rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg py-16">
											<Music className="text-muted-foreground h-16 w-16" />
											<audio controls className="w-3/4">
												<source src={fileUrl} type={mimeType} />
												Your browser does not support the audio element.
											</audio>
										</div>
									);
								case "TEXT":
									return (
										<div className="flex w-full items-center justify-center rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg py-16">
											<FileText className="text-muted-foreground h-16 w-16" />
										</div>
									);
								case "DOCUMENT":
									return (
										<div className="flex w-full h-full min-h-[400px] items-center justify-center rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg">
											<File className="text-muted-foreground h-24 w-24" />
										</div>
									);
								case "ARCHIVE":
									return (
										<div className="flex w-full h-full min-h-[400px] items-center justify-center rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg">
											<Archive className="text-muted-foreground h-24 w-24" />
										</div>
									);
								case "IMAGE":
								default:
									return imageDimensions ? (
										<div className="relative w-full h-full">
											<Image
												src={fileUrl}
												alt={filename}
												fill
												className="object-cover rounded-tl-lg lg:rounded-bl-lg lg:rounded-tr-none rounded-tr-lg"
												priority
												sizes="(max-width: 1024px) 100vw, 60vw"
											/>
										</div>
									) : (
										<div className="flex w-full items-center justify-center py-16">
											<div className="animate-pulse text-muted-foreground">
												Loading...
											</div>
										</div>
									);
							}
						})()}
					</div>
					<CardContent className="p-6 w-full lg:w-2/5 flex flex-col justify-between">
						<div className="mb-6">
							<h1 className="text-foreground text-lg font-semibold break-all mb-6">
								{filename}
							</h1>
						</div>

						<div className="flex flex-col gap-4 mb-6">
							<div className="space-y-3">
								<div>
									<h3 className="text-foreground text-xs font-medium mb-1.5">
										Type
									</h3>
									<p className="text-muted-foreground text-sm font-normal">
										{fileType}
									</p>
								</div>
								<div>
									<h3 className="text-foreground text-xs font-medium mb-1.5">
										Size
									</h3>
									<p className="text-muted-foreground text-sm font-normal">
										{formatBytes(filesize)}
									</p>
								</div>
								<div>
									<h3 className="text-foreground text-xs font-medium mb-1.5">
										Uploaded
									</h3>
									<p className="text-muted-foreground text-sm font-normal">
										{formatDate(uploadAt)}
									</p>
								</div>
								<div>
									<h3 className="text-foreground text-xs font-medium mb-1.5">
										Expires
									</h3>
									<p className="text-muted-foreground text-sm font-normal">
										{formatDate(expiresAt)}
									</p>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-2 mt-auto">
							<Button onClick={handleDownload} size="sm" className="w-full cursor-pointer">
								<Download className="h-4 w-4 mr-2" />
								Download
							</Button>
						</div>
					</CardContent>
				</div>
			</Card>
		</div>
	);
}
