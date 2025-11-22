import { SlugPageContent } from "@/components/pages/SlugPageContent";
import { getMetadataForSlug } from "@/config/metadata";

interface SlugPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SlugPageProps) {
	const { slug } = await params;
	return getMetadataForSlug(slug);
}

export default async function SlugPage({ params }: SlugPageProps) {
	const awaitedParams = await params;
	return <SlugPageContent params={awaitedParams} />;
}
