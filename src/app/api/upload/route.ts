import { type NextRequest, NextResponse } from "next/server";
import {
	startUpload,
	directUpload,
	completeUpload,
	uploadChunk,
	cancelUpload,
	cleanupFailedUpload,
} from "@/lib/api/uploads";
import type {
	StartUploadRequest,
	CompleteUploadRequest,
	ErrorResponse,
} from "@/types/uploads";

type UploadAction = "start" | "direct" | "chunk" | "complete" | "cancel";

interface BaseUploadRequest {
	action: UploadAction;
}

interface DirectUploadBody extends BaseUploadRequest {
	action: "direct";
	filename: string;
	mimeType: string;
	filesize: number;
	domain?: string;
	expires: string;
	buffer: string;
}

interface ChunkUploadBody extends BaseUploadRequest {
	action: "chunk";
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
	chunk: string;
}

interface CancelUploadBody extends BaseUploadRequest {
	action: "cancel";
	uploadId: string;
}

export async function POST(req: NextRequest) {
	try {
		const contentType = req.headers.get("content-type") || "";

		if (
			contentType.includes("multipart") ||
			contentType.includes("octet-stream")
		) {
			const action = req.headers.get("x-upload-action") as UploadAction;

			if (!action) {
				return NextResponse.json<ErrorResponse>(
					{ error: "Missing x-upload-action header" },
					{ status: 400 },
				);
			}

			switch (action) {
				case "direct":
					return handleDirectUploadBinary(req);
				case "chunk":
					return handleChunkUploadBinary(req);
				default:
					return NextResponse.json<ErrorResponse>(
						{ error: "Invalid action for binary upload" },
						{ status: 400 },
					);
			}
		}

		const body = (await req.json()) as BaseUploadRequest;

		if (!body.action) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing action field" },
				{ status: 400 },
			);
		}

		switch (body.action) {
			case "start":
				return handleStartUpload(body as unknown as StartUploadRequest);

			case "direct":
				return handleDirectUploadJSON(body as DirectUploadBody);

			case "chunk":
				return handleChunkUploadJSON(body as ChunkUploadBody);

			case "complete":
				return handleCompleteUpload(body as unknown as CompleteUploadRequest);

			case "cancel":
				return handleCancelUpload(body as CancelUploadBody);

			default:
				return NextResponse.json<ErrorResponse>(
					{ error: "Invalid action" },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("Error in upload API:", error);
		return NextResponse.json<ErrorResponse>(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

async function handleStartUpload(body: StartUploadRequest) {
	const result = await startUpload(body);

	if (!result.success) {
		const errorResponse: ErrorResponse = {
			error: result.error,
		};

		if (result.details) {
			errorResponse.details = result.details;
		}

		return NextResponse.json<ErrorResponse>(errorResponse, {
			status: result.status,
		});
	}

	return NextResponse.json(result.data, { status: result.status });
}

async function handleDirectUploadJSON(body: DirectUploadBody) {
	const {
		filename,
		mimeType,
		filesize,
		domain,
		expires,
		buffer: base64Buffer,
	} = body;

	if (!filename || !mimeType || !expires || !base64Buffer) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Missing required fields" },
			{ status: 400 },
		);
	}

	const buffer = Buffer.from(base64Buffer, "base64");

	const result = await directUpload({
		filename,
		mimeType,
		filesize,
		domain,
		expires,
		buffer,
	});

	if (!result.success) {
		const errorResponse: ErrorResponse = {
			error: result.error,
		};

		if (result.details) {
			errorResponse.details = result.details;
		}

		return NextResponse.json<ErrorResponse>(errorResponse, {
			status: result.status,
		});
	}

	return NextResponse.json(result.data, { status: result.status });
}

async function handleDirectUploadBinary(req: NextRequest) {
	const filename = req.headers.get("x-filename");
	const mimeType = req.headers.get("x-mime-type");
	const domain = req.headers.get("x-domain");
	const expires = req.headers.get("x-expires");
	const filesizeStr = req.headers.get("x-filesize");

	if (!filename || !mimeType || !expires || !filesizeStr) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Missing required headers" },
			{ status: 400 },
		);
	}

	const filesize = parseInt(filesizeStr, 10);

	if (Number.isNaN(filesize)) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Invalid filesize" },
			{ status: 400 },
		);
	}

	const arrayBuffer = await req.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const result = await directUpload({
		filename,
		mimeType,
		filesize,
		domain: domain || undefined,
		expires,
		buffer,
	});

	if (!result.success) {
		const errorResponse: ErrorResponse = {
			error: result.error,
		};

		if (result.details) {
			errorResponse.details = result.details;
		}

		return NextResponse.json<ErrorResponse>(errorResponse, {
			status: result.status,
		});
	}

	return NextResponse.json(result.data, { status: result.status });
}

async function handleChunkUploadJSON(body: ChunkUploadBody) {
	const { uploadId, chunkIndex, totalChunks, chunk: base64Chunk } = body;

	if (!uploadId || chunkIndex === undefined || !totalChunks || !base64Chunk) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Missing required fields" },
			{ status: 400 },
		);
	}

	const buffer = Buffer.from(base64Chunk, "base64");
	const chunkSize = buffer.length;

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(buffer);
			controller.close();
		},
	});

	const result = await uploadChunk({
		uploadId,
		chunkIndex,
		totalChunks,
		chunkSize,
		stream,
	});

	if (!result.success) {
		return NextResponse.json<ErrorResponse>(
			{ error: result.error },
			{ status: result.status },
		);
	}

	return NextResponse.json(result.data, { status: result.status });
}

async function handleChunkUploadBinary(req: NextRequest) {
	const uploadId = req.headers.get("x-upload-id");
	const chunkIndex = req.headers.get("x-chunk-index");
	const totalChunks = req.headers.get("x-total-chunks");

	if (!uploadId || chunkIndex === null || totalChunks === null) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Missing required headers" },
			{ status: 400 },
		);
	}

	const chunkIndexNum = parseInt(chunkIndex, 10);
	const totalChunksNum = parseInt(totalChunks, 10);

	const contentLength = req.headers.get("content-length");
	if (!contentLength) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Missing Content-Length header" },
			{ status: 400 },
		);
	}

	const chunkSize = parseInt(contentLength, 10);

	if (!req.body) {
		return NextResponse.json<ErrorResponse>(
			{ error: "Missing request body" },
			{ status: 400 },
		);
	}

	const result = await uploadChunk({
		uploadId,
		chunkIndex: chunkIndexNum,
		totalChunks: totalChunksNum,
		chunkSize,
		stream: req.body,
	});

	if (!result.success) {
		return NextResponse.json<ErrorResponse>(
			{ error: result.error },
			{ status: result.status },
		);
	}

	return NextResponse.json(result.data, { status: result.status });
}

async function handleCompleteUpload(body: CompleteUploadRequest) {
	try {
		const result = await completeUpload(body);

		if (!result.success) {
			const errorResponse: ErrorResponse = {
				error: result.error,
			};

			if (result.details) {
				errorResponse.details = result.details;
			}

			return NextResponse.json<ErrorResponse>(errorResponse, {
				status: result.status,
			});
		}

		return NextResponse.json(result.data, { status: result.status });
	} catch (error) {
		console.error("Error completing upload:", error);

		try {
			if (body.uploadId) {
				await cleanupFailedUpload(body.uploadId);
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

async function handleCancelUpload(body: CancelUploadBody) {
	const { uploadId } = body;
	const result = await cancelUpload(uploadId);

	if (!result.success) {
		return NextResponse.json<ErrorResponse>(
			{ error: result.error },
			{ status: result.status },
		);
	}

	return NextResponse.json({ success: true }, { status: result.status });
}
