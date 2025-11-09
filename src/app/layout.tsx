import { Root } from "@/components/layout";

export const metadata = {
	icons: {
		icon: "/favicon.png",
		shortcut: "/favicon.png",
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
