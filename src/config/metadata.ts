import type { Metadata } from "next";
import { getFileUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";

export const baseMetadata: Metadata = {
	icons: {
		icon: "/favicon.webp",
		shortcut: "/favicon.webp",
	},
};

export const routeMetadata: Record<string, Metadata> = {
	"/": {
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
					url: "https://hallaxi.us/favicon.webp",
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
			images: ["https://hallaxi.us/favicon.webp"],
		},
	},
	"/_not-found": {
		title: "Not Found - Hallaxius",
		description: "The page you are looking for does not exist.",
	},
};

export function getStaticMetadataForRoute(route: string): Metadata {
	const routeMeta = routeMetadata[route];

	if (routeMeta) {
		return {
			...baseMetadata,
			...routeMeta,
		};
	}

	return baseMetadata;
}

function getFileType(mimeType: string): "VIDEO" | "IMAGE" | "OTHER" {
	if (mimeType.startsWith("video/")) return "VIDEO";
	if (mimeType.startsWith("image/")) return "IMAGE";
	return "OTHER";
}

export function generateFileMetadata(slug: string, record: any): Metadata {
	const fileUrl = getFileUrl(slug, record.filename);
	const fileType = getFileType(record.mimeType);

	const dimensions = {
		width: typeof record.width === "number" ? record.width : 1280,
		height: typeof record.height === "number" ? record.height : 720,
	};

	if (fileType === "VIDEO") {
		return {
			title: record.filename,
			openGraph: {
				title: record.filename,
				type: "video.other",
				url: fileUrl,
				videos: [
					{
						url: fileUrl,
						width: dimensions.width,
						height: dimensions.height,
						type: record.mimeType,
					},
				],
				images: [
					{
						url: fileUrl + "?thumb=1",
						width: dimensions.width,
						height: dimensions.height,
						alt: record.filename
							? `${record.filename} thumbnail`
							: "Video thumbnail",
						type: "image/jpeg",
					},
				],
			},
			twitter: {
				card: "player",
				title: record.filename,
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
			title: record.filename,
			openGraph: {
				title: record.filename,
				type: "website",
				url: fileUrl,
				images: [
					{
						url: fileUrl,
						width: dimensions.width,
						height: dimensions.height,
						alt: record.filename,
						type: "image/jpeg",
					},
				],
			},
			twitter: {
				card: "summary_large_image",
				title: record.filename,
				images: [fileUrl],
			},
		};
	}

	return {
		title: record.filename,
		openGraph: {
			title: record.filename,
			type: "website",
			url: fileUrl,
		},
		twitter: {
			card: "summary",
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
			const fileMetadata = generateFileMetadata(slug, record);
			return {
				...baseMetadata,
				...fileMetadata,
			};
		}

		return {
			...baseMetadata,
			title: "File not found",
		};
	} catch (error) {
		console.error("Error fetching metadata for slug:", slug, error);
		return {
			...baseMetadata,
			title: "Error",
		};
	}
}

export async function getMetadataForRoute(pathname: string): Promise<Metadata> {
	if (pathname.startsWith("/") && pathname !== "/") {
		const slug = pathname.substring(1);
		return getMetadataForSlug(slug);
	}

	const routeMeta = routeMetadata[pathname];
	if (routeMeta) {
		return {
			...baseMetadata,
			...routeMeta,
		};
	}
	return baseMetadata;
}
