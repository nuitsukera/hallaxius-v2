// Lista de MIME types permitidos (whitelist)
const ALLOWED_MIME_TYPES = new Set([
	// Imagens
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
	// Vídeos
	"video/mp4",
	"video/mpeg",
	"video/ogg",
	"video/webm",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-matroska",
	// Áudio
	"audio/mpeg",
	"audio/mp3",
	"audio/wav",
	"audio/ogg",
	"audio/webm",
	"audio/aac",
	"audio/flac",
	"audio/m4a",
	// Documentos
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
	// Arquivos compactados
	"application/zip",
	"application/x-zip-compressed",
	"application/x-rar-compressed",
	"application/x-7z-compressed",
	"application/gzip",
	"application/x-tar",
	// Outros
	"application/octet-stream",
]);

// MIME types perigosos que devem ser bloqueados
const DANGEROUS_MIME_TYPES = new Set([
	"application/x-msdownload", // .exe
	"application/x-msdos-program",
	"application/x-executable",
	"application/x-sh", // Shell scripts
	"application/x-bat",
	"application/x-cmd",
	"text/x-sh",
	"text/x-shellscript",
	"application/x-apple-diskimage", // .dmg
	"application/vnd.microsoft.portable-executable",
]);

export function isValidMimeType(mimeType: string): boolean {
	if (!mimeType) return false;
	
	const normalizedMime = mimeType.toLowerCase().trim();
	
	// Bloquear MIME types perigosos
	if (DANGEROUS_MIME_TYPES.has(normalizedMime)) {
		return false;
	}
	
	// Permitir apenas MIME types na whitelist
	return ALLOWED_MIME_TYPES.has(normalizedMime);
}

export function sanitizeFilename(filename: string): string {
	// Remove caracteres perigosos e limita tamanho
	return filename
		.replace(/[^a-zA-Z0-9._-]/g, "_") // Remove caracteres especiais
		.slice(0, 255); // Limita a 255 caracteres
}

export function validateFileSize(size: number, maxSize: number): boolean {
	return size > 0 && size <= maxSize;
}

export const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB
export const MIN_FILE_SIZE = 1; // 1 byte
