import { Open_Sans } from "next/font/google";

export const openSans = Open_Sans({
  variable: "--font-sans",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
  style: ["normal"],
  fallback: [
    "Segoe UI",
    "Arial",
    "ui-sans-serif",
    "system-ui",
    "sans-serif"
  ],
  adjustFontFallback: true,
});

export const fontClassName = `${openSans.variable} antialiased`;