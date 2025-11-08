import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ErrorPage from "@/components/pages/ErrorPage";

interface SlugPageProps {
	params: Promise<{ slug: string }>;
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
		}
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
	redirect(r2Url);
}