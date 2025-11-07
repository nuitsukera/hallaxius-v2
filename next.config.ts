import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	env: {
		R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
	},
	images: {
		domains: ["r2.hallaxi.us"],
		// Ou se você usa caminhos customizados:
		// remotePatterns: [
		//   {
		//     protocol: 'https',
		//     hostname: 'r2.hallaxi.us',
		//     pathname: '/**',
		//   },
		// ],
	},
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
