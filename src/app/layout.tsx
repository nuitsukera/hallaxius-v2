import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { fontClassName } from "@/config/fonts";

export { metadata } from "@/config/metadata";

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className="select-none cursor-default"
		>
			<body className={`${fontClassName} bg-background text-foreground`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	);
}
