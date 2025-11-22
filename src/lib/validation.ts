const ALLOWED_MIME_TYPES = new Set([
	"image/*",
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	"image/bmp",
	"image/tiff",
	"image/ico",
	"image/x-icon",
	"image/vnd.microsoft.icon",
	"image/apng",
	"image/avif",
	"image/heic",
	"image/heif",
	"image/x-portable-bitmap",
	"image/x-portable-graymap",
	"image/x-portable-pixmap",
	"image/x-xbitmap",
	"image/x-xpixmap",
	"image/x-cmu-raster",

	"video/*",
	"video/mp4",
	"video/mpeg",
	"video/ogg",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-matroska",
	"video/3gpp",
	"video/3gpp2",
	"video/h261",
	"video/h263",
	"video/h264",
	"video/jpeg",
	"video/jpm",
	"video/mj2",
	"video/mp2t",
	"video/mp4v-es",
	"video/x-flv",
	"video/x-m4v",
	"video/x-ms-wmv",
	"video/x-ms-asf",

	"application/zip",
	"application/x-zip-compressed",
	"application/x-rar-compressed",
	"application/x-7z-compressed",
	"application/gzip",
	"application/x-gzip",
	"application/x-tar",
	"application/x-bzip2",
	"application/x-bzip",
	"application/x-lzip",
	"application/x-lzma",
	"application/x-xz",
	"application/x-compress",
	"application/x-archive",
	"application/vnd.rar",
	"application/zstd",

	"text/plain",
	"text/csv",
	"text/html",
	"text/css",
	"text/javascript",
	"text/typescript",
	"text/x-typescript",
	"application/javascript",
	"application/typescript",
	"application/x-typescript",
	"application/json",
	"application/xml",
	"text/xml",
	"text/markdown",
	"text/x-markdown",
	"text/yaml",
	"text/x-yaml",
	"application/x-yaml",
	"text/x-python",
	"text/x-java",
	"text/x-c",
	"text/x-c++",
	"text/x-csharp",
	"text/x-php",
	"text/x-ruby",
	"text/x-go",
	"text/x-rust",
	"text/x-shellscript",
	"application/x-shellscript",
	"text/x-sql",
	"application/sql",
	"text/x-swift",
	"text/x-kotlin",
	"text/x-scala",
	"text/x-dart",
	"text/x-lua",
	"text/x-perl",
	"text/x-r",
	"text/x-matlab",
	"application/vnd.coffeescript",
	"text/x-coffeescript",
	"application/vnd.dart",
	"text/x-dart",
	"application/vnd.swift",
	"text/x-swift",
]);

const DANGEROUS_MIME_TYPES = new Set([
	"application/x-msdownload",
	"application/x-msdos-program",
	"application/x-executable",
	"application/x-sh",
	"application/x-bat",
	"application/x-cmd",
	"application/x-apple-diskimage",
	"application/vnd.microsoft.portable-executable",
]);

export function isValidMimeType(mimeType: string): boolean {
	if (!mimeType) return false;
	const normalizedMime = mimeType.toLowerCase().trim();

	if (DANGEROUS_MIME_TYPES.has(normalizedMime)) {
		return false;
	}

	if (normalizedMime === "image/*" || normalizedMime === "video/*") {
		return true;
	}

	return ALLOWED_MIME_TYPES.has(normalizedMime);
}

export function sanitizeFilename(filename: string): string {
	return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
}

export function validateFileSize(size: number, maxSize: number): boolean {
	return size > 0 && size <= maxSize;
}

export const MAX_FILE_SIZE = 512 * 1024 * 1024;
export const MIN_FILE_SIZE = 1;
