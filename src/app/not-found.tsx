import type { Metadata } from "next";
import { getStaticMetadataForRoute } from "@/config/metadata";
import ErrorPage from "@/components/pages/ErrorPage";

export const metadata: Metadata = getStaticMetadataForRoute("/_not-found");

export default function NotFound() {
	return <ErrorPage title="404" description="Page not found" />;
}
