import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
	if (!r2Client) {
		const accountId = process.env.R2_ACCOUNT_ID;
		const accessKeyId = process.env.R2_ACCESS_KEY_ID;
		const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

		if (!accountId || !accessKeyId || !secretAccessKey) {
			throw new Error("R2 credentials not configured");
		}

		r2Client = new S3Client({
			region: "auto",
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}

	return r2Client;
}

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

export async function uploadToR2(
	key: string,
	body: Buffer | Uint8Array | ReadableStream,
	contentType: string,
): Promise<void> {
	const client = getR2Client();

	await client.send(
		new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function uploadChunk(
	uploadId: string,
	chunkIndex: number,
	body: Buffer | Uint8Array,
): Promise<void> {
	const key = `temp/${uploadId}/chunk-${chunkIndex}`;
	await uploadToR2(key, body, "application/octet-stream");
}

export async function listChunks(uploadId: string): Promise<string[]> {
	const client = getR2Client();
	const prefix = `temp/${uploadId}/`;

	const response = await client.send(
		new ListObjectsV2Command({
			Bucket: BUCKET_NAME,
			Prefix: prefix,
		}),
	);

	return (response.Contents || [])
		.map((item) => item.Key)
		.filter((key): key is string => key !== undefined)
		.sort();
}

export async function getChunk(key: string): Promise<Buffer> {
	const client = getR2Client();

	const response = await client.send(
		new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		}),
	);

	if (!response.Body) {
		throw new Error("Chunk not found");
	}

	const chunks: Uint8Array[] = [];
	for await (const chunk of response.Body as any) {
		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
}

export async function mergeChunks(
	uploadId: string,
	finalKey: string,
	contentType: string,
): Promise<void> {
	const chunkKeys = await listChunks(uploadId);

	if (chunkKeys.length === 0) {
		throw new Error("No chunks found");
	}

	const buffers: Buffer[] = [];
	for (const key of chunkKeys) {
		const buffer = await getChunk(key);
		buffers.push(buffer);
	}

	const finalBuffer = Buffer.concat(buffers);

	await uploadToR2(finalKey, finalBuffer, contentType);

	await deleteChunks(uploadId);
}

export async function deleteChunks(uploadId: string): Promise<void> {
	const client = getR2Client();
	const chunkKeys = await listChunks(uploadId);

	for (const key of chunkKeys) {
		await client.send(
			new DeleteObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
			}),
		);
	}
}

export async function deleteFromR2(key: string): Promise<void> {
	const client = getR2Client();

	await client.send(
		new DeleteObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		}),
	);
}

export function getPublicUrl(slug: string, filename: string, domain?: string): string {
	const baseUrl = domain 
		? `https://${domain}` 
		: process.env.R2_PUBLIC_BASE_URL;
	return `${baseUrl}/${slug}`;
}