import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import ErrorPage from "@/components/pages/ErrorPage";
import FileViewPage from "@/components/pages/FileViewPage";

interface SlugPageProps {
	params: Promise<{ slug: string }>;
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
		},
	});

	if (!record) {
		return {
			title: "Not Found",
		};
	}

	const r2Url = `${process.env.R2_PUBLIC_BASE_URL}/${slug}/${encodeURIComponent(record.filename)}`;
	const isVideo = record.mimeType.startsWith("video/");

	const metadata: Metadata = {
		title: record.filename,
		openGraph: {
			title: record.filename,
			type: isVideo ? "video.other" : "website",
			siteName: "Hallaxius",
		},
		twitter: {
			card: isVideo ? "summary_large_image" : "summary",
			title: record.filename,
		},
	};

	if (isVideo) {
		metadata.openGraph = {
			...metadata.openGraph,
			videos: [
				{
					url: r2Url,
					type: record.mimeType,
				},
			],
			images: [
				{
					url: r2Url,
					alt: record.filename,
					width: 1200,
					height: 630,
				},
			],
		};
		metadata.twitter = {
			...metadata.twitter,
			images: [
				{
					url: r2Url,
					alt: record.filename,
				},
			],
		};
	}

	return metadata;
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
