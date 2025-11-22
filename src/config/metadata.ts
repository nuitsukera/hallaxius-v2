import type { Metadata } from "next";
import { getFileUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";

export const baseMetadata: Metadata = {
	metadataBase: new URL("https://hallaxi.us"),
	icons: {
		icon: "/favicon.webp",
		shortcut: "/favicon.webp",
	},
};

export const homeMetadata: Metadata = {
	...baseMetadata,
	title: "Hallaxius",
	description:
		"Easily share screenshots, video clips, project files, and more. Send up to 512 MB quickly and securely.",
	openGraph: {
		title: "Hallaxius",
		description:
			"Easily share screenshots, video clips, project files, and more. Send up to 512 MB quickly and securely.",
		type: "website",
		images: [
			{
				url: "/favicon.webp",
				width: 128,
				height: 128,
				alt: "Hallaxius Logo",
			},
		],
	},
	twitter: {
		card: "summary",
		title: "Hallaxius",
		description:
			"Easily share screenshots, video clips, project files, and more. Send up to 512 MB quickly and securely.",
		images: ["/favicon.webp"],
	},
	robots: {
		index: true,
		follow: true,
	},
};

export const notFoundMetadata: Metadata = {
	...baseMetadata,
	title: "Not Found - Hallaxius",
	robots: {
		index: false,
		follow: false,
	},
};

export function getStaticMetadataForRoute(route: string): Metadata {
	if (route === "/") {
		return homeMetadata;
	}

	if (route === "/_not-found") {
		return notFoundMetadata;
	}

	return baseMetadata;
}

function getFileType(mimeType: string): "VIDEO" | "IMAGE" | "OTHER" {
	if (mimeType.startsWith("video/")) return "VIDEO";
	if (mimeType.startsWith("image/")) return "IMAGE";
	return "OTHER";
}

function getOptimizedDimensions(
	width: number,
	height: number,
): { width: number; height: number } {
	const aspectRatio = width / height;
	const maxWidth = 1200;
	const maxHeight = 630;

	if (aspectRatio > 1.91) {
		return { width: maxWidth, height: Math.round(maxWidth / aspectRatio) };
	} else if (aspectRatio < 1.27) {
		return { width: Math.round(maxHeight * aspectRatio), height: maxHeight };
	}

	if (width > maxWidth || height > maxHeight) {
		const scale = Math.min(maxWidth / width, maxHeight / height);
		return {
			width: Math.round(width * scale),
			height: Math.round(height * scale),
		};
	}

	return { width, height };
}

export function generateFileMetadata(slug: string, record: any): Metadata {
	const fileUrl = getFileUrl(slug, record.filename);
	const fileType = getFileType(record.mimeType);

	const originalDimensions = {
		width: typeof record.width === "number" ? record.width : 1280,
		height: typeof record.height === "number" ? record.height : 720,
	};

	const optimizedDimensions = getOptimizedDimensions(
		originalDimensions.width,
		originalDimensions.height,
	);

	const baseMeta = {
		...baseMetadata,
		title: record.filename,
		description: undefined,
		robots: {
			index: false,
			follow: false,
		},
	};

	if (fileType === "VIDEO") {
		return {
			...baseMeta,
			openGraph: {
				title: record.filename,
				description: undefined,
				type: "video.other",
				url: fileUrl,
				videos: [
					{
						url: fileUrl,
						width: originalDimensions.width,
						height: originalDimensions.height,
						type: record.mimeType,
					},
				],
				images: [
					{
						url: `${fileUrl}?thumb=1`,
						width: optimizedDimensions.width,
						height: optimizedDimensions.height,
						alt: record.filename,
						type: "image/jpeg",
					},
				],
			},
			twitter: {
				card: "player",
				title: record.filename,
				description: undefined,
				images: [`${fileUrl}?thumb=1`],
				players: [
					{
						playerUrl: fileUrl,
						streamUrl: fileUrl,
						width: originalDimensions.width,
						height: originalDimensions.height,
					},
				],
			},
		};
	}

	if (fileType === "IMAGE") {
		return {
			...baseMeta,
			openGraph: {
				title: record.filename,
				description: undefined,
				type: "website",
				url: fileUrl,
				images: [
					{
						url: fileUrl,
						width: optimizedDimensions.width,
						height: optimizedDimensions.height,
						alt: record.filename,
						type: record.mimeType || "image/jpeg",
					},
				],
			},
			twitter: {
				card: "summary_large_image",
				title: record.filename,
				description: undefined,
				images: [fileUrl],
			},
		};
	}

	return {
		...baseMeta,
		openGraph: {
			title: record.filename,
			description: undefined,
			type: "website",
			url: fileUrl,
		},
		twitter: {
			card: "summary",
			title: record.filename,
			description: undefined,
		},
	};
}

export async function getMetadataForSlug(slug: string): Promise<Metadata> {
	try {
		const record = await prisma.upload.findUnique({
			where: { slug },
			select: {
				filename: true,
				mimeType: true,
				width: true,
				height: true,
			},
		});

		if (record) {
			return generateFileMetadata(slug, record);
		}

		return notFoundMetadata;
	} catch (error) {
		console.error("Error fetching metadata for slug:", slug, error);
		return {
			...baseMetadata,
			title: "Error - Hallaxius",
		};
	}
}
