import { prisma } from "@/lib/prisma";
import {
	getR2Bucket,
	getMultipartUploadState,
	resumeMultipartUpload,
	deleteMultipartUploadState,
	uploadToR2,
	getPublicUrl,
	createMultipartUpload,
	saveMultipartUploadState,
	completeMultipartUpload,
	uploadPart,
} from "@/lib/r2";
import {
	isValidMimeType,
	sanitizeFilename,
	validateFileSize,
	MAX_FILE_SIZE,
	MIN_FILE_SIZE,
} from "@/lib/validation";
import { generateSlug, generateUploadId } from "@/lib/utils";
import { getMediaDimensions, isMediaType } from "@/lib/media";
import { ThumbnailService } from "@/lib/thumbnail";
import {
	EXPIRES_MAP,
	DIRECT_UPLOAD_LIMIT,
	CHUNK_SIZE,
	type StartUploadRequest,
	type StartUploadResponse,
	type CompleteUploadRequest,
	type UploadResponse,
	type ChunkUploadResponse,
} from "@/types/uploads";

type SuccessResult<T> = {
	success: true;
	data: T;
	status: number;
};

type ErrorResult = {
	success: false;
	error: string;
	details?: string;
	status: number;
};

type ApiResult<T> = SuccessResult<T> | ErrorResult;

export interface GetUploadInfoParams {
	slug: string;
	currentDomain?: string;
}

export async function getUploadInfo(
	params: GetUploadInfoParams,
): Promise<ApiResult<any>> {
	const { slug, currentDomain } = params;

	if (!slug || typeof slug !== "string") {
		return {
			success: false,
			error: "Invalid slug",
			status: 400,
		};
	}

	const record = await prisma.upload.findUnique({
		where: { slug },
		select: {
			id: true,
			slug: true,
			filename: true,
			domain: true,
			expiresAt: true,
			mimeType: true,
			filesize: true,
			uploadAt: true,
			thumbnail: true,
			width: true,
			height: true,
		},
	});

	if (!record) {
		return {
			success: false,
			error: "This file does not exist or has expired.",
			status: 404,
		};
	}

	const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
	if (isExpired) {
		return {
			success: false,
			error: "This file does not exist or has expired.",
			status: 404,
		};
	}

	if (record.domain && currentDomain) {
		const recordDomain = record.domain.toLowerCase();
		const requestDomain = currentDomain.toLowerCase();

		if (recordDomain !== requestDomain) {
			return {
				success: false,
				error: "This file does not exist or has expired.",
				status: 404,
			};
		}
	}

	return {
		success: true,
		data: record,
		status: 200,
	};
}

export async function startUpload(
	body: StartUploadRequest,
): Promise<ApiResult<StartUploadResponse>> {
	if (!body.filename || !body.filesize || !body.mimeType) {
		return {
			success: false,
			error: "Missing required fields",
			status: 400,
		};
	}

	if (!validateFileSize(body.filesize, MAX_FILE_SIZE)) {
		return {
			success: false,
			error: "File too large",
			details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
			status: 400,
		};
	}

	if (body.filesize < MIN_FILE_SIZE) {
		return {
			success: false,
			error: "File too small",
			status: 400,
		};
	}

	if (!isValidMimeType(body.mimeType)) {
		return {
			success: false,
			error: "Invalid file type",
			details: `Type ${body.mimeType} not allowed`,
			status: 400,
		};
	}

	const sanitizedFilename = sanitizeFilename(body.filename);

	let slug = generateSlug();
	let attempts = 0;
	while (attempts < 10) {
		const existing = await prisma.upload.findUnique({
			where: { slug },
		});

		if (!existing) break;

		slug = generateSlug();
		attempts++;
	}

	if (attempts >= 10) {
		return {
			success: false,
			error: "Failed to generate unique slug",
			status: 500,
		};
	}

	const uploadId = generateUploadId();
	const isDirectUpload = body.filesize <= DIRECT_UPLOAD_LIMIT;
	const totalChunks = isDirectUpload
		? 1
		: Math.ceil(body.filesize / CHUNK_SIZE);

	if (!isDirectUpload) {
		const bucket = getR2Bucket();
		const finalKey = `${slug}/${sanitizedFilename}`;
		const multipartUpload = await createMultipartUpload(
			bucket,
			finalKey,
			body.mimeType,
		);
		await saveMultipartUploadState(
			bucket,
			uploadId,
			multipartUpload.uploadId,
			finalKey,
		);
	}

	const response: StartUploadResponse = {
		uploadId,
		slug,
		totalChunks,
		chunkSize: CHUNK_SIZE,
		isDirectUpload,
	};

	return {
		success: true,
		data: response,
		status: 200,
	};
}

export interface DirectUploadParams {
	filename: string;
	mimeType: string;
	filesize: number;
	domain?: string;
	expires: string;
	buffer: Buffer;
}

export async function directUpload(
	params: DirectUploadParams,
): Promise<ApiResult<UploadResponse>> {
	const { filename, mimeType, filesize, domain, expires, buffer } = params;

	if (filesize > DIRECT_UPLOAD_LIMIT) {
		return {
			success: false,
			error: "File too large for direct upload",
			details: "Use chunked upload for files larger than 10MB",
			status: 400,
		};
	}

	if (!validateFileSize(filesize, MAX_FILE_SIZE)) {
		return {
			success: false,
			error: "File too large",
			status: 400,
		};
	}

	if (filesize < MIN_FILE_SIZE) {
		return {
			success: false,
			error: "File too small",
			status: 400,
		};
	}

	if (!isValidMimeType(mimeType)) {
		return {
			success: false,
			error: "Invalid file type",
			status: 400,
		};
	}

	if (!["1h", "1d", "7d", "30d"].includes(expires)) {
		return {
			success: false,
			error: "Invalid expiration option",
			status: 400,
		};
	}

	const sanitizedFilename = sanitizeFilename(filename);

	let slug = generateSlug();
	let attempts = 0;
	while (attempts < 10) {
		const existing = await prisma.upload.findUnique({
			where: { slug },
		});

		if (!existing) break;

		slug = generateSlug();
		attempts++;
	}

	if (attempts >= 10) {
		return {
			success: false,
			error: "Failed to generate unique slug",
			status: 500,
		};
	}

	const key = `${slug}/${sanitizedFilename}`;

	if (buffer.length !== filesize) {
		return {
			success: false,
			error: "File size mismatch",
			details: `Expected ${filesize} bytes, got ${buffer.length}`,
			status: 400,
		};
	}

	const bucket = getR2Bucket();
	await uploadToR2(bucket, key, buffer, mimeType);

	let width: number | undefined;
	let height: number | undefined;
	let thumbnailPath: string | undefined;

	if (isMediaType(mimeType)) {
		const dimensions = await getMediaDimensions(buffer, mimeType);
		if (dimensions) {
			width = dimensions.width;
			height = dimensions.height;
		}

		if (mimeType.startsWith("video/")) {
			try {
				const thumbnailResult = await ThumbnailService.generateVideoThumbnail(
					buffer,
					mimeType,
					slug,
					sanitizedFilename,
				);

				if (thumbnailResult) {
					thumbnailPath = ThumbnailService.getThumbnailKey(
						slug,
						sanitizedFilename,
					);
					width = thumbnailResult.width;
					height = thumbnailResult.height;
				}
			} catch (thumbnailError) {
				console.error("Error generating thumbnail:", thumbnailError);
			}
		}
	}

	const expiresAt = new Date(
		Date.now() + EXPIRES_MAP[expires as keyof typeof EXPIRES_MAP],
	);

	const upload = await prisma.upload.create({
		data: {
			slug,
			filename: sanitizedFilename,
			filesize,
			mimeType,
			domain: domain || "",
			width,
			height,
			thumbnail: thumbnailPath,
			expiresAt,
		},
	});

	const url = getPublicUrl(slug, sanitizedFilename, domain || undefined);
	const thumbnailUrl = thumbnailPath
		? ThumbnailService.getThumbnailUrl(slug, sanitizedFilename, domain)
		: undefined;

	const response: UploadResponse = {
		id: upload.id,
		slug: upload.slug,
		url,
		expiresAt: upload.expiresAt.toISOString(),
		width: upload.width ?? undefined,
		height: upload.height ?? undefined,
		thumbnail: thumbnailUrl,
	};

	return {
		success: true,
		data: response,
		status: 200,
	};
}

export interface UploadChunkParams {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
	chunkSize: number;
	stream: ReadableStream;
}

export async function uploadChunk(
	params: UploadChunkParams,
): Promise<ApiResult<ChunkUploadResponse>> {
	const { uploadId, chunkIndex, totalChunks, chunkSize, stream } = params;

	if (
		Number.isNaN(chunkIndex) ||
		Number.isNaN(totalChunks) ||
		chunkIndex < 0 ||
		chunkIndex >= totalChunks
	) {
		return {
			success: false,
			error: "Invalid chunk parameters",
			status: 400,
		};
	}

	const bucket = getR2Bucket();
	const state = await getMultipartUploadState(bucket, uploadId);

	if (!state) {
		return {
			success: false,
			error: "Upload not found",
			status: 404,
		};
	}

	const multipartUpload = await resumeMultipartUpload(
		bucket,
		state.key,
		state.multipartUploadId,
	);

	if (chunkSize === 0) {
		return {
			success: false,
			error: "Empty chunk",
			status: 400,
		};
	}

	const partNumber = chunkIndex + 1;

	const { readable, writable } = new FixedLengthStream(chunkSize);
	const pipePromise = stream.pipeTo(writable);

	const uploadedPart = await uploadPart(multipartUpload, partNumber, readable);

	await pipePromise;

	const response: ChunkUploadResponse = {
		success: true,
		chunkIndex,
		uploaded: chunkIndex + 1,
		total: totalChunks,
		uploadedPart: {
			partNumber: uploadedPart.partNumber,
			etag: uploadedPart.etag,
		},
	};

	return {
		success: true,
		data: response,
		status: 200,
	};
}

export async function completeUpload(
	body: CompleteUploadRequest,
): Promise<ApiResult<UploadResponse>> {
	if (
		!body.uploadId ||
		!body.slug ||
		!body.filename ||
		!body.filesize ||
		!body.mimeType ||
		!body.expires
	) {
		return {
			success: false,
			error: "Missing required fields",
			status: 400,
		};
	}

	const bucket = getR2Bucket();
	const sanitizedFilename = sanitizeFilename(body.filename);
	const finalKey = `${body.slug}/${sanitizedFilename}`;

	const state = await getMultipartUploadState(bucket, body.uploadId);
	if (!state) {
		return {
			success: false,
			error: "Upload not found",
			status: 404,
		};
	}

	if (!body.uploadedParts || body.uploadedParts.length !== body.totalChunks) {
		return {
			success: false,
			error: "Missing chunks",
			details: `Expected ${body.totalChunks} chunks, got ${body.uploadedParts?.length || 0}`,
			status: 400,
		};
	}

	const sortedParts = body.uploadedParts.sort(
		(a, b) => a.partNumber - b.partNumber,
	);

	for (let i = 0; i < sortedParts.length; i++) {
		if (sortedParts[i].partNumber !== i + 1) {
			return {
				success: false,
				error: "Invalid part numbers",
				details: `Expected part ${i + 1}, got ${sortedParts[i].partNumber}`,
				status: 400,
			};
		}
	}

	const multipartUpload = await resumeMultipartUpload(
		bucket,
		state.key,
		state.multipartUploadId,
	);

	await completeMultipartUpload(multipartUpload, sortedParts as any);
	await deleteMultipartUploadState(bucket, body.uploadId);

	let width: number | undefined;
	let height: number | undefined;
	let thumbnailPath: string | undefined;

	if (isMediaType(body.mimeType)) {
		try {
			const r2Object = await bucket.get(finalKey);
			if (r2Object) {
				const arrayBuffer = await r2Object.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				const dimensions = await getMediaDimensions(buffer, body.mimeType);
				if (dimensions) {
					width = dimensions.width;
					height = dimensions.height;
				}

				if (body.mimeType.startsWith("video/")) {
					try {
						const thumbnailResult =
							await ThumbnailService.generateVideoThumbnail(
								buffer,
								body.mimeType,
								body.slug,
								sanitizedFilename,
							);

						if (thumbnailResult) {
							thumbnailPath = ThumbnailService.getThumbnailKey(
								body.slug,
								sanitizedFilename,
							);
							width = thumbnailResult.width;
							height = thumbnailResult.height;
						}
					} catch (thumbnailError) {
						console.error("Error generating thumbnail:", thumbnailError);
					}
				}
			}
		} catch (dimensionError) {
			console.error("Error extracting dimensions:", dimensionError);
		}
	}

	const expiresAt = new Date(Date.now() + EXPIRES_MAP[body.expires]);

	const upload = await prisma.upload.create({
		data: {
			slug: body.slug,
			filename: sanitizedFilename,
			filesize: body.filesize,
			mimeType: body.mimeType,
			domain: body.domain || "",
			width,
			height,
			thumbnail: thumbnailPath,
			expiresAt,
		},
	});

	const url = getPublicUrl(
		body.slug,
		sanitizedFilename,
		body.domain || undefined,
	);

	const thumbnailUrl = thumbnailPath
		? ThumbnailService.getThumbnailUrl(
				body.slug,
				sanitizedFilename,
				body.domain,
			)
		: undefined;

	const response: UploadResponse = {
		id: upload.id,
		slug: upload.slug,
		url,
		expiresAt: upload.expiresAt.toISOString(),
		width: upload.width ?? undefined,
		height: upload.height ?? undefined,
		thumbnail: thumbnailUrl,
	};

	return {
		success: true,
		data: response,
		status: 200,
	};
}

export async function cancelUpload(
	uploadId: string,
): Promise<ApiResult<{ success: true }>> {
	if (!uploadId) {
		return {
			success: false,
			error: "Missing uploadId",
			status: 400,
		};
	}

	const bucket = getR2Bucket();
	const state = await getMultipartUploadState(bucket, uploadId);

	if (state) {
		try {
			const multipartUpload = await resumeMultipartUpload(
				bucket,
				state.key,
				state.multipartUploadId,
			);
			await multipartUpload.abort();
		} catch (error) {
			console.error("Error aborting multipart upload:", error);
		}

		await deleteMultipartUploadState(bucket, uploadId);
	}

	return {
		success: true,
		data: { success: true },
		status: 200,
	};
}

export async function cleanupFailedUpload(uploadId: string): Promise<void> {
	try {
		const bucket = getR2Bucket();
		const state = await getMultipartUploadState(bucket, uploadId);

		if (state) {
			try {
				const multipartUpload = await resumeMultipartUpload(
					bucket,
					state.key,
					state.multipartUploadId,
				);
				await multipartUpload.abort();
			} catch (abortError) {
				console.error("Error aborting multipart upload:", abortError);
			}

			await deleteMultipartUploadState(bucket, uploadId);
		}
	} catch (cleanupError) {
		console.error("Error during cleanup:", cleanupError);
	}
}
