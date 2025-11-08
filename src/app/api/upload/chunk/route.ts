import { NextRequest, NextResponse } from "next/server";
import {
	getR2Bucket,
	getMultipartUploadState,
	resumeMultipartUpload,
	uploadPart,
} from "@/lib/r2";
import type { ChunkUploadResponse, ErrorResponse } from "@/types/uploads";

export async function POST(req: NextRequest) {
	try {
		const bucket = getR2Bucket();

		const searchParams = req.nextUrl.searchParams;
		const uploadId = searchParams.get("uploadId");
		const chunkIndex = searchParams.get("chunkIndex");
		const totalChunks = searchParams.get("totalChunks");

		if (!uploadId || chunkIndex === null || totalChunks === null) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing required parameters" },
				{ status: 400 },
			);
		}

		const chunkIndexNum = parseInt(chunkIndex, 10);
		const totalChunksNum = parseInt(totalChunks, 10);

		if (
			Number.isNaN(chunkIndexNum) ||
			Number.isNaN(totalChunksNum) ||
			chunkIndexNum < 0 ||
			chunkIndexNum >= totalChunksNum
		) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Invalid chunk parameters" },
				{ status: 400 },
			);
		}

		const state = await getMultipartUploadState(bucket, uploadId);
		if (!state) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Upload not found" },
				{ status: 404 },
			);
		}

		const multipartUpload = await resumeMultipartUpload(
			bucket,
			state.key,
			state.multipartUploadId,
		);

		const contentLength = req.headers.get("content-length");
		if (!contentLength) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing Content-Length header" },
				{ status: 400 },
			);
		}

		const chunkSize = parseInt(contentLength, 10);
		if (chunkSize === 0) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Empty chunk" },
				{ status: 400 },
			);
		}

		if (!req.body) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing request body" },
				{ status: 400 },
			);
		}

		const partNumber = chunkIndexNum + 1;

		const { readable, writable } = new FixedLengthStream(chunkSize);

		const pipePromise = req.body.pipeTo(writable);

		const uploadedPart = await uploadPart(
			multipartUpload,
			partNumber,
			readable,
		);

		await pipePromise;

		const response: ChunkUploadResponse = {
			success: true,
			chunkIndex: chunkIndexNum,
			uploaded: chunkIndexNum + 1,
			total: totalChunksNum,
			uploadedPart: {
				partNumber: uploadedPart.partNumber,
				etag: uploadedPart.etag,
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error uploading chunk:", error);

		const errorDetails =
			error instanceof Error
				? `${error.name}: ${error.message}`
				: "Unknown error";

		console.error("Chunk upload failed:", {
			uploadId: req.nextUrl.searchParams.get("uploadId"),
			chunkIndex: req.nextUrl.searchParams.get("chunkIndex"),
			error: errorDetails,
		});

		return NextResponse.json<ErrorResponse>(
			{
				error: "Failed to upload chunk",
				details: errorDetails,
			},
			{ status: 500 },
		);
	}
}
