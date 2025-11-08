import { NextRequest, NextResponse } from "next/server";
import { generateSlug, generateUploadId } from "@/lib/utils";
import {
	isValidMimeType,
	sanitizeFilename,
	validateFileSize,
	MAX_FILE_SIZE,
	MIN_FILE_SIZE,
} from "@/lib/validation";
import type {
	StartUploadRequest,
	StartUploadResponse,
	ErrorResponse,
} from "@/types/uploads";
import { CHUNK_SIZE, DIRECT_UPLOAD_LIMIT } from "@/types/uploads";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as StartUploadRequest;

		if (!body.filename || !body.filesize || !body.mimeType) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		if (!validateFileSize(body.filesize, MAX_FILE_SIZE)) {
			return NextResponse.json<ErrorResponse>(
				{
					error: "File too large",
					details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
				},
				{ status: 400 },
			);
		}

		if (body.filesize < MIN_FILE_SIZE) {
			return NextResponse.json<ErrorResponse>(
				{ error: "File too small" },
				{ status: 400 },
			);
		}

		if (!isValidMimeType(body.mimeType)) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Invalid file type", details: `Type ${body.mimeType} not allowed` },
				{ status: 400 },
			);
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
			return NextResponse.json<ErrorResponse>(
				{ error: "Failed to generate unique slug" },
				{ status: 500 },
			);
		}

		const uploadId = generateUploadId();

		const isDirectUpload = body.filesize <= DIRECT_UPLOAD_LIMIT;
		const totalChunks = isDirectUpload
			? 1
			: Math.ceil(body.filesize / CHUNK_SIZE);

		const response: StartUploadResponse = {
			uploadId,
			slug,
			totalChunks,
			chunkSize: CHUNK_SIZE,
			isDirectUpload,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error starting upload:", error);
		return NextResponse.json<ErrorResponse>(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}