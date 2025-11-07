export {};

declare global {
	interface CloudflareEnv {
		R2_CACHE: R2Bucket;
	}

	interface CloudflareVars {
		R2_PUBLIC_BASE_URL: string;
	}

	interface CloudflareContext {
		env: CloudflareEnv;
		vars: CloudflareVars;
	}
}
