import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getFileUrl } from "@/lib/url";
import { SlugPageContent } from "@/components/pages/SlugPageContent";

interface SlugPageProps {
	params: Promise<{ slug: string }>;
}

function getFileType(mimeType: string): "VIDEO" | "IMAGE" | "OTHER" {
	if (mimeType.startsWith("video/")) return "VIDEO";
	if (mimeType.startsWith("image/")) return "IMAGE";
	return "OTHER";
}

function generateFileMetadata({
	filename,
	mimeType,
	fileUrl,
	width,
	height,
}: {
	filename: string;
	mimeType: string;
	fileUrl: string;
	width?: number | null;
	height?: number | null;
}): Metadata {
	const fileType = getFileType(mimeType);

	const dimensions = {
		width: typeof width === "number" ? width : 1280,
		height: typeof height === "number" ? height : 720,
	};

	if (fileType === "VIDEO") {
		return {
			title: filename,
			description: undefined,
			openGraph: {
				title: filename,
				description: undefined,
				type: "video.other",
				url: fileUrl,
				videos: [
					{
						url: fileUrl,
						width: dimensions.width,
						height: dimensions.height,
						type: mimeType,
					},
				],
				images: [
					{
						url: fileUrl + "?thumb=1",
						width: dimensions.width,
						height: dimensions.height,
						alt: filename ? `${filename} thumbnail` : "Video thumbnail",
						type: "image/jpeg",
					},
				],
			},
			twitter: {
				card: "player",
				title: filename,
				description: undefined,
				images: [fileUrl + "?thumb=1"],
				players: [
					{
						playerUrl: fileUrl,
						streamUrl: fileUrl,
						width: dimensions.width,
						height: dimensions.height,
					},
				],
			},
		};
	}

	if (fileType === "IMAGE") {
		return {
			title: filename,
			description: undefined,
			openGraph: {
				title: filename,
				description: undefined,
				type: "website",
				url: fileUrl,
				images: [
					{
						url: fileUrl,
						width: dimensions.width,
						height: dimensions.height,
						alt: filename,
						type: "image/jpeg",
					},
				],
			},
			twitter: {
				card: "summary_large_image",
				title: filename,
				description: undefined,
				images: [fileUrl],
			},
		};
	}

	return {
		title: filename,
		openGraph: {
			title: filename,
			type: "website",
			url: fileUrl,
		},
		twitter: {
			card: "summary_large_image",
		},
	};
}

export async function generateMetadata({
	params,
}: SlugPageProps): Promise<Metadata> {
	const { slug } = await params;

	const record = await prisma.upload.findUnique({
		where: { slug },
		select: {
			filename: true,
			mimeType: true,
			width: true,
			height: true,
		},
	});

	if (!record) {
		return {
			title: "File not found",
		};
	}

	const fileUrl = getFileUrl(slug, record.filename);

	return generateFileMetadata({
		filename: record.filename,
		mimeType: record.mimeType,
		fileUrl,
		width: record.width,
		height: record.height,
	});
}

export default async function SlugPage({ params }: SlugPageProps) {
	const awaitedParams = await params;
	return <SlugPageContent params={awaitedParams} />;
}
