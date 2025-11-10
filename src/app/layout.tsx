import { Root } from "@/components/layout";
import { title } from "process";

export const metadata = {
	title: "Hallaxius",
	icons: {
		icon: "/favicon.webp",
		shortcut: "/favicon.webp",
	},
	openGraph: {
		url: "https://hallaxi.us",
		siteName: "Hallaxius",
		type: "website",
		locale: "en_US",
	},
	metadataBase: new URL("https://hallaxi.us"),
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Root>{children}</Root>;
}
