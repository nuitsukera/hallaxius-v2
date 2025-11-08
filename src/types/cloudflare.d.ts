export {};

declare global {
	interface CloudflareEnv {
		NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
		R2_PUBLIC_BASE_URL: string;
		CRON_SECRET?: string;
	}

	interface CloudflareVars {
		R2_PUBLIC_BASE_URL: string;
	}

	interface CloudflareContext {
		env: CloudflareEnv;
		vars: CloudflareVars;
	}
}
