"use client";

import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const Root = ({ children }: { children: React.ReactNode }) => {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className="select-none cursor-default"
		>
			<body className={`${inter.className} bg-background text-foreground`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					forcedTheme="dark"
					enableSystem={false}
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	);
};
