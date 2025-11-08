export type ExpiresOption = "1h" | "1d" | "7d" | "30d";

export const EXPIRES_MAP: Record<ExpiresOption, number> = {
	"1h": 60 * 60 * 1000,
	"1d": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
};

// Constantes
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk
export const DIRECT_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10MB limite para upload direto

// Requisição para iniciar upload
export interface StartUploadRequest {
	filename: string;
	filesize: number;
	mimeType: string;
	domain: string;
	expires: ExpiresOption;
}

// Resposta ao iniciar upload
export interface StartUploadResponse {
	uploadId: string;
	slug: string;
	totalChunks: number;
	chunkSize: number;
	isDirectUpload: boolean;
}

// Requisição para upload de chunk
export interface ChunkUploadRequest {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
}

// Resposta de upload de chunk
export interface ChunkUploadResponse {
	success: boolean;
	chunkIndex: number;
	uploaded: number;
	total: number;
}

// Requisição para completar upload
export interface CompleteUploadRequest {
	uploadId: string;
	slug: string;
	filename: string;
	filesize: number;
	mimeType: string;
	domain: string;
	expires: ExpiresOption;
	totalChunks: number;
}

// Resposta final de upload
export interface UploadResponse {
	id: string;
	slug: string;
	url: string;
	expiresAt: string;
}

// Resposta de erro
export interface ErrorResponse {
	error: string;
	details?: string;
}
