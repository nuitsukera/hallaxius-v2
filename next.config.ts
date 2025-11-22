import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	env: {
		R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
	},
	allowedDevOrigins: ["highlights-ridge-contributions-rugs.trycloudflare.com"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "r2.hallaxi.us",
				pathname: "/**",
			},
		],
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "512mb",
		},
	},
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			};
		}
		return config;
	},
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
