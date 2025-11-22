import type { Metadata } from "next";
import { getStaticMetadataForRoute } from "@/config/metadata";
import { Root } from "@/components/layout";

export const metadata: Metadata = getStaticMetadataForRoute("/");

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Root>{children}</Root>;
}
