import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	env: {
		R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
	},
	allowedDevOrigins: ["basket-brother-fishing-rss.trycloudflare.com"],
	images: {
		domains: ["r2.hallaxi.us"],
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
