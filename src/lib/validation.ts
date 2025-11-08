const ALLOWED_MIME_TYPES = new Set([
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
	"video/mp4",
	"video/mpeg",
	"video/ogg",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-matroska",
	"audio/mpeg",
	"audio/mp3",
	"audio/wav",
	"audio/ogg",
	"audio/webm",
	"audio/aac",
	"audio/flac",
	"audio/m4a",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"text/plain",
	"text/csv",
	"text/html",
	"text/css",
	"text/javascript",
	"application/json",
	"application/xml",
	"text/xml",
	"application/zip",
	"application/x-zip-compressed",
	"application/x-rar-compressed",
	"application/x-7z-compressed",
	"application/gzip",
	"application/x-tar",
	"application/octet-stream",
]);

const DANGEROUS_MIME_TYPES = new Set([
	"application/x-msdownload",
	"application/x-msdos-program",
	"application/x-executable",
	"application/x-sh",
	"application/x-bat",
	"application/x-cmd",
	"text/x-sh",
	"text/x-shellscript",
	"application/x-apple-diskimage",
	"application/vnd.microsoft.portable-executable",
]);

export function isValidMimeType(mimeType: string): boolean {
	if (!mimeType) return false;
	const normalizedMime = mimeType.toLowerCase().trim();
	if (DANGEROUS_MIME_TYPES.has(normalizedMime)) {
		return false;
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
