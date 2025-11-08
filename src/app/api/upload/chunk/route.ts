import { NextRequest, NextResponse } from "next/server";
import { uploadChunk } from "@/lib/r2";
import type { ChunkUploadResponse, ErrorResponse } from "@/types/uploads";

export async function POST(req: NextRequest) {
	try {
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

		const arrayBuffer = await req.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		if (buffer.length === 0) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Empty chunk" },
				{ status: 400 },
			);
		}

		await uploadChunk(uploadId, chunkIndexNum, buffer);

		const response: ChunkUploadResponse = {
			success: true,
			chunkIndex: chunkIndexNum,
			uploaded: chunkIndexNum + 1,
			total: totalChunksNum,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error uploading chunk:", error);
		return NextResponse.json<ErrorResponse>(
			{ error: "Failed to upload chunk" },
			{ status: 500 },
		);
	}
}