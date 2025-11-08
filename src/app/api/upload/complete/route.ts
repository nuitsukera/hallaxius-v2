import { NextRequest, NextResponse } from "next/server";
import {
	getPublicUrl,
	getR2Bucket,
	getMultipartUploadState,
	resumeMultipartUpload,
	completeMultipartUpload,
	deleteMultipartUploadState,
} from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { sanitizeFilename } from "@/lib/validation";
import type {
	CompleteUploadRequest,
	UploadResponse,
	ErrorResponse,
} from "@/types/uploads";
import { EXPIRES_MAP } from "@/types/uploads";

export async function POST(req: NextRequest) {
	try {
		const bucket = getR2Bucket();

		const body = (await req.json()) as CompleteUploadRequest;

		if (
			!body.uploadId ||
			!body.slug ||
			!body.filename ||
			!body.filesize ||
			!body.mimeType ||
			!body.expires
		) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const sanitizedFilename = sanitizeFilename(body.filename);

		const finalKey = `${body.slug}/${sanitizedFilename}`;

		const state = await getMultipartUploadState(bucket, body.uploadId);
		if (!state) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Upload not found" },
				{ status: 404 },
			);
		}

		if (!body.uploadedParts || body.uploadedParts.length !== body.totalChunks) {
			return NextResponse.json<ErrorResponse>(
				{
					error: "Missing chunks",
					details: `Expected ${body.totalChunks} chunks, got ${body.uploadedParts?.length || 0}`,
				},
				{ status: 400 },
			);
		}

		const sortedParts = body.uploadedParts.sort(
			(a, b) => a.partNumber - b.partNumber,
		);

		for (let i = 0; i < sortedParts.length; i++) {
			if (sortedParts[i].partNumber !== i + 1) {
				return NextResponse.json<ErrorResponse>(
					{
						error: "Invalid part numbers",
						details: `Expected part ${i + 1}, got ${sortedParts[i].partNumber}`,
					},
					{ status: 400 },
				);
			}
		}

		const multipartUpload = await resumeMultipartUpload(
			bucket,
			state.key,
			state.multipartUploadId,
		);

		await completeMultipartUpload(multipartUpload, sortedParts as any);

		await deleteMultipartUploadState(bucket, body.uploadId);

		const expiresAt = new Date(Date.now() + EXPIRES_MAP[body.expires]);

		const upload = await prisma.upload.create({
			data: {
				slug: body.slug,
				filename: sanitizedFilename,
				filesize: body.filesize,
				mimeType: body.mimeType,
				domain: body.domain || "",
				expiresAt,
			},
		});

		const url = getPublicUrl(
			body.slug,
			sanitizedFilename,
			body.domain || undefined,
		);

		const response: UploadResponse = {
			id: upload.id,
			slug: upload.slug,
			url,
			expiresAt: upload.expiresAt.toISOString(),
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error completing upload:", error);

		try {
			const body = (await req.clone().json()) as CompleteUploadRequest;
			if (body.uploadId) {
				const bucket = getR2Bucket();
				const state = await getMultipartUploadState(bucket, body.uploadId);

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

					await deleteMultipartUploadState(bucket, body.uploadId);
				}
			}
		} catch (cleanupError) {
			console.error("Error during cleanup:", cleanupError);
		}

		return NextResponse.json<ErrorResponse>(
			{
				error: "Failed to complete upload",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
