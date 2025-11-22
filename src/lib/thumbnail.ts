import { Buffer } from "node:buffer";
import { getR2Bucket, uploadToR2 } from "@/lib/r2";
import { getImageDimensions } from "@/lib/media";

export interface ThumbnailResult {
	thumbnailBuffer: Buffer;
	width: number;
	height: number;
	mimeType: string;
}

export class ThumbnailService {
	private static supportedVideoFormats = [
		"video/*",
		"video/mp4",
		"video/mpeg",
		"video/ogg",
		"video/webm",
		"video/quicktime",
		"video/x-msvideo",
		"video/x-matroska",
		"video/3gpp",
		"video/3gpp2",
		"video/h261",
		"video/h263",
		"video/h264",
		"video/jpeg",
		"video/jpm",
		"video/mj2",
		"video/mp2t",
		"video/mp4v-es",
		"video/x-flv",
		"video/x-m4v",
		"video/x-ms-wmv",
		"video/x-ms-asf",
	];

	static isVideoFormatSupported(mimeType: string): boolean {
		return (
			mimeType.startsWith("video/") ||
			this.supportedVideoFormats.includes(mimeType)
		);
	}

	static async generateVideoThumbnail(
		videoBuffer: Buffer,
		mimeType: string,
		slug: string,
		filename: string,
		timeInSeconds: number = 1,
	): Promise<ThumbnailResult | null> {
		try {
			if (!this.isVideoFormatSupported(mimeType)) {
				return null;
			}

			const tempKey = `${slug}/temp/${filename}`;
			const bucket = getR2Bucket();

			await uploadToR2(bucket, tempKey, videoBuffer, mimeType);

			const { FFmpeg } = await import("@ffmpeg/ffmpeg");
			const { fetchFile } = await import("@ffmpeg/util");

			const ffmpeg = new FFmpeg();
			await ffmpeg.load();

			const inputName = "input_video";
			const outputName = "thumbnail.jpg";

			const blob = new Blob([new Uint8Array(videoBuffer)], { type: mimeType });
			await ffmpeg.writeFile(inputName, await fetchFile(blob));

			await ffmpeg.exec([
				"-i",
				inputName,
				"-ss",
				timeInSeconds.toString(),
				"-vframes",
				"1",
				"-q:v",
				"2",
				"-y",
				outputName,
			]);

			const thumbnailData = await ffmpeg.readFile(outputName);
			const thumbnailBuffer = Buffer.from(thumbnailData);

			await ffmpeg.deleteFile(inputName);
			await ffmpeg.deleteFile(outputName);

			const dimensions = await getImageDimensions(
				thumbnailBuffer,
				"image/jpeg",
			);

			if (!dimensions) {
				throw new Error("Could not extract thumbnail dimensions");
			}

			const thumbnailKey = this.getThumbnailKey(slug, filename);
			await uploadToR2(bucket, thumbnailKey, thumbnailBuffer, "image/jpeg");

			await bucket.delete(tempKey);

			return {
				thumbnailBuffer,
				width: dimensions.width,
				height: dimensions.height,
				mimeType: "image/jpeg",
			};
		} catch (error) {
			console.error("Error generating video thumbnail:", error);

			try {
				const bucket = getR2Bucket();
				const tempKey = `${slug}/temp/${filename}`;
				await bucket.delete(tempKey);
			} catch (cleanupError) {
				console.error("Error cleaning up temp file:", cleanupError);
			}

			return null;
		}
	}

	static getThumbnailKey(slug: string, filename: string): string {
		const baseName = filename.replace(/\.[^/.]+$/, "");
		return `${slug}/thumbnail/${baseName}.jpg`;
	}

	static getThumbnailUrl(
		slug: string,
		filename: string,
		domain?: string,
	): string {
		const thumbnailKey = this.getThumbnailKey(slug, filename);
		const { getPublicUrl } = require("@/lib/r2");
		return getPublicUrl(thumbnailKey, domain);
	}
}
