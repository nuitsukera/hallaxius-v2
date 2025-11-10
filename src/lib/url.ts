// src/lib/fileUrl.ts

/**
 * Gera a URL pública de um arquivo armazenado no storage (ex: Cloudflare R2).
 *
 * @param slug - O slug único do upload.
 * @param filename - O nome original do arquivo.
 * @returns A URL completa para acessar o arquivo.
 */
export function getFileUrl(slug: string, filename: string): string {
	const baseUrl = process.env.R2_PUBLIC_BASE_URL;

	if (!baseUrl) {
		throw new Error(
			"R2_PUBLIC_BASE_URL is not defined in the environment variables.",
		);
	}

	return `${baseUrl}/${slug}/${encodeURIComponent(filename)}`;
}
