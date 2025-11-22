"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
	DefaultVideoLayout,
	defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import type { DefaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import { TimeSlider } from "@vidstack/react";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

interface FileViewPageProps {
	slug: string;
	filename: string;
	fileUrl: string;
	mimeType: string;
	filesize: number;
	uploadAt: Date;
	expiresAt: Date;
	uploadId: string;
}

const None = () => null;

const customIcons: DefaultLayoutIcons = {
	...defaultLayoutIcons,
	AirPlayButton: { Default: None, Connecting: None, Connected: None },
	GoogleCastButton: { Default: None, Connecting: None, Connected: None },
	CaptionButton: { On: None, Off: None },
	DownloadButton: { Default: None },
	Menu: {
		...defaultLayoutIcons.Menu,
		Accessibility: None,
		Chapters: None,
		Captions: None,
		Playback: None,
		FontSizeUp: None,
		FontSizeDown: None,
		OpacityUp: None,
		OpacityDown: None,
		RadioCheck: None,
	},
	KeyboardDisplay: {
		...defaultLayoutIcons.KeyboardDisplay,
		CaptionsOn: None,
		CaptionsOff: None,
		SeekForward: None,
		SeekBackward: None,
	},
	PlayButton: { ...defaultLayoutIcons.PlayButton },
	MuteButton: { ...defaultLayoutIcons.MuteButton },
};

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / k ** i;
	const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
	return `${formattedSize} ${sizes[i]}`;
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

function getFileType(mimeType: string): "IMAGE" | "VIDEO" {
	if (mimeType.startsWith("image/")) return "IMAGE";
	if (mimeType.startsWith("video/")) return "VIDEO";
	throw new Error("Unsupported file type");
}

export default function FileViewPage({
	slug,
	filename,
	fileUrl,
	mimeType,
	filesize,
	uploadAt,
	expiresAt,
	uploadId,
}: FileViewPageProps) {
	const fileType = getFileType(mimeType);
	const [imageDimensions, setImageDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const triggerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (fileType === "IMAGE") {
			const img = new window.Image();
			img.src = fileUrl;
			img.onload = () =>
				setImageDimensions({ width: img.width, height: img.height });
		}
	}, [fileUrl, fileType]);

	useEffect(() => {
		const handleRightClick = (e: MouseEvent) => {
			if (menuOpen) {
				e.preventDefault();
				setMenuOpen(false);
			}
		};
		document.addEventListener("contextmenu", handleRightClick);
		return () => document.removeEventListener("contextmenu", handleRightClick);
	}, [menuOpen]);

	const handleDownload = async () => {
		try {
			const tokenResponse = await fetch("/api/download/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ uploadId }),
			});

			if (!tokenResponse.ok) {
				let errMessage = "Failed to get download token";
				try {
					const errJson = (await tokenResponse.json()) as { error?: string };
					if (errJson && "error" in errJson) {
						errMessage = errJson.error || errMessage;
					}
				} catch {}
				toast.error(errMessage);
				return;
			}

			const data = (await tokenResponse.json()) as { token?: string };

			if (!data.token) {
				toast.error("Invalid response from server");
				return;
			}

			const downloadResponse = await fetch("/api/download", {
				headers: {
					"x-download-token": data.token,
				},
			});

			if (!downloadResponse.ok) {
				let errMessage = "Download failed";
				try {
					const errJson = (await downloadResponse.json()) as { error?: string };
					if (errJson && "error" in errJson) {
						errMessage = errJson.error || errMessage;
					}
				} catch {}
				toast.error(errMessage);
				return;
			}

			const blob = await downloadResponse.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Download started!", {
				description: "Your file is being downloaded",
			});
		} catch (error) {
			console.error("Download failed:", error);
			toast.error("Download failed. Please try again.");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center py-4 px-2 sm:px-4 md:px-8">
			<ContextMenu onOpenChange={setMenuOpen}>
				<ContextMenuTrigger
					ref={triggerRef}
					className="w-full max-w-[80vw] lg:max-w-[70vw]"
				>
					<div className="relative border border-input rounded-xl overflow-hidden hover:border-ring/50 duration-500">
						{fileType === "IMAGE" && imageDimensions && (
							<Image
								src={fileUrl}
								alt={filename}
								width={imageDimensions.width}
								height={imageDimensions.height}
								className="object-contain w-full h-auto max-h-[60vh] sm:max-h-[70vh] lg:max-h-[80vh] rounded-xl"
								priority
							/>
						)}
						{fileType === "VIDEO" && (
							<div className="w-full aspect-video max-h-[60vh] sm:max-h-[70vh] lg:max-h-[80vh]">
								<MediaPlayer
									src={fileUrl}
									title={filename}
									crossOrigin="anonymous"
									playsInline
									controls={false}
									className="w-full h-full"
								>
									<MediaProvider />
									<DefaultVideoLayout
										icons={customIcons}
										colorScheme="dark"
										slots={{
											googleCastButton: null,
											airPlayButton: null,
											captionButton: null,
											timeSlider: (
												<TimeSlider.Root className="vds-time-slider vds-slider">
													<TimeSlider.Track className="vds-slider-track" />
													<TimeSlider.TrackFill className="vds-slider-track-fill vds-slider-track" />
													<TimeSlider.Progress className="vds-slider-progress vds-slider-track" />
													<TimeSlider.Thumb className="vds-slider-thumb" />
												</TimeSlider.Root>
											),
										}}
									/>
								</MediaPlayer>
							</div>
						)}
					</div>
				</ContextMenuTrigger>

				<ContextMenuContent className="w-64">
					<ContextMenuItem onClick={handleDownload}>
						<Download className="mr-2 h-4 w-4" />
						Download
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem disabled>Name: {filename}</ContextMenuItem>
					<ContextMenuItem disabled>
						Size: {formatBytes(filesize)}
					</ContextMenuItem>
					<ContextMenuItem disabled>
						Uploaded: {formatDate(uploadAt)}
					</ContextMenuItem>
					<ContextMenuItem disabled>
						Expires: {formatDate(expiresAt)}
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		</div>
	);
}
