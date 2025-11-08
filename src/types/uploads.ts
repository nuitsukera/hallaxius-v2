export type ExpiresOption = "1h" | "1d" | "7d" | "30d";

export const EXPIRES_MAP: Record<ExpiresOption, number> = {
	"1h": 60 * 60 * 1000,
	"1d": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
	"30d": 30 * 24 * 60 * 60 * 1000,
};

export const CHUNK_SIZE = 20 * 1024 * 1024;
export const DIRECT_UPLOAD_LIMIT = 10 * 1024 * 1024;

export interface StartUploadRequest {
	filename: string;
	filesize: number;
	mimeType: string;
	domain?: string;
	expires: ExpiresOption;
}

export interface StartUploadResponse {
	uploadId: string;
	slug: string;
	totalChunks: number;
	chunkSize: number;
	isDirectUpload: boolean;
}

export interface ChunkUploadRequest {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
}

export interface UploadedPartInfo {
	partNumber: number;
	etag: string;
}

export interface ChunkUploadResponse {
	success: boolean;
	chunkIndex: number;
	uploaded: number;
	total: number;
	uploadedPart: UploadedPartInfo;
}

export interface CompleteUploadRequest {
	uploadId: string;
	slug: string;
	filename: string;
	filesize: number;
	mimeType: string;
	domain?: string;
	expires: ExpiresOption;
	totalChunks: number;
	uploadedParts: UploadedPartInfo[];
}

export interface UploadResponse {
	id: string;
	slug: string;
	url: string;
	expiresAt: string;
}

export interface ErrorResponse {
	error: string;
	details?: string;
}

export interface DomainOption {
	id: string;
	value: string;
	label: string;
}
