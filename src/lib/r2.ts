import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getR2Bucket(): R2Bucket {
	const context = getCloudflareContext();
	const bucket = context.env.UPLOADS_R2_BUCKET;

	if (!bucket) {
		throw new Error("R2 bucket binding not available");
	}

	return bucket;
}

export async function uploadToR2(
	bucket: R2Bucket,
	key: string,
	body: Buffer | Uint8Array | ReadableStream,
	contentType: string,
): Promise<void> {
	await bucket.put(key, body, {
		httpMetadata: {
			contentType,
		},
	});
}

export async function createMultipartUpload(
	bucket: R2Bucket,
	key: string,
	contentType: string,
): Promise<R2MultipartUpload> {
	return await bucket.createMultipartUpload(key, {
		httpMetadata: {
			contentType,
		},
	});
}

export async function uploadPart(
	multipartUpload: R2MultipartUpload,
	partNumber: number,
	body: ArrayBuffer | ArrayBufferView | ReadableStream,
): Promise<R2UploadedPart> {
	return await multipartUpload.uploadPart(partNumber, body);
}

export async function completeMultipartUpload(
	multipartUpload: R2MultipartUpload,
	uploadedParts: R2UploadedPart[],
): Promise<R2Object> {
	return await multipartUpload.complete(uploadedParts);
}

export async function abortMultipartUpload(
	multipartUpload: R2MultipartUpload,
): Promise<void> {
	await multipartUpload.abort();
}

export async function saveMultipartUploadState(
	bucket: R2Bucket,
	uploadId: string,
	multipartUploadId: string,
	key: string,
): Promise<void> {
	const stateKey = `multipart-state/${uploadId}`;
	const state = JSON.stringify({ multipartUploadId, key });
	await bucket.put(stateKey, state);
}

export async function getMultipartUploadState(
	bucket: R2Bucket,
	uploadId: string,
): Promise<{ multipartUploadId: string; key: string } | null> {
	const stateKey = `multipart-state/${uploadId}`;
	const object = await bucket.get(stateKey);
	if (!object) return null;
	const text = await object.text();
	return JSON.parse(text);
}

export async function resumeMultipartUpload(
	bucket: R2Bucket,
	key: string,
	multipartUploadId: string,
): Promise<R2MultipartUpload> {
	return bucket.resumeMultipartUpload(key, multipartUploadId);
}

export async function deleteMultipartUploadState(
	bucket: R2Bucket,
	uploadId: string,
): Promise<void> {
	const stateKey = `multipart-state/${uploadId}`;
	await bucket.delete(stateKey);
}

export async function deleteFromR2(
	bucket: R2Bucket,
	key: string,
): Promise<void> {
	await bucket.delete(key);
}

export function getPublicUrl(
	slug: string,
	filename: string,
	domain?: string,
): string {
	const baseUrl = domain ? `https://${domain}` : process.env.R2_PUBLIC_BASE_URL;
	return `${baseUrl}/${slug}`;
}
