import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import ErrorPage from "@/components/pages/ErrorPage";
import FileViewPage from "@/components/pages/FileViewPage";

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
		       openGraph: {
			       title: filename,
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
					       url: fileUrl,
					       width: dimensions.width,
					       height: dimensions.height,
				       },
			       ],
		       },
		       twitter: {
			       card: "summary_large_image",
			       images: [fileUrl],
		       },
		};
	}

	if (fileType === "IMAGE") {
	       return {
		       title: filename,
		       openGraph: {
			       title: filename,
			       type: "website",
			       url: fileUrl,
			       images: [
				       {
					       url: fileUrl,
					       width: dimensions.width,
					       height: dimensions.height,
				       },
			       ],
		       },
		       twitter: {
			       card: "summary_large_image",
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

	const fileUrl = `${process.env.R2_PUBLIC_BASE_URL}/${slug}/${encodeURIComponent(record.filename)}`;

	return generateFileMetadata({
		filename: record.filename,
		mimeType: record.mimeType,
		fileUrl,
		width: record.width,
		height: record.height,
	});
}

export default async function SlugPage({ params }: SlugPageProps) {
	const { slug } = await params;

	if (!slug) {
		return (
			<ErrorPage
				title="Not found"
				description="This file does not exist or has expired."
			/>
		);
	}

	const record = await prisma.upload.findUnique({
		where: { slug },
		select: {
			slug: true,
			filename: true,
			domain: true,
			expiresAt: true,
			mimeType: true,
			filesize: true,
			uploadAt: true,
		},
	});

	if (!record) {
		return (
			<ErrorPage
				title="Not found"
				description="This file does not exist or has expired."
			/>
		);
	}

	const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
	if (isExpired) {
		return (
			<ErrorPage
				title="Not found"
				description="This file does not exist or has expired."
			/>
		);
	}

	const headersList = await headers();
	const currentDomain = headersList.get("host");

	if (record.domain && currentDomain) {
		const recordDomain = record.domain.toLowerCase();
		const requestDomain = currentDomain.toLowerCase();

		if (recordDomain !== requestDomain) {
			return (
				<ErrorPage
					title="Not found"
					description="This file does not exist or has expired."
				/>
			);
		}
	}

	const r2Url = `${process.env.R2_PUBLIC_BASE_URL}/${slug}/${encodeURIComponent(record.filename)}`;

	return (
		<FileViewPage
			filename={record.filename}
			fileUrl={r2Url}
			mimeType={record.mimeType}
			filesize={record.filesize}
			uploadAt={record.uploadAt}
			expiresAt={record.expiresAt}
		/>
	);
}
