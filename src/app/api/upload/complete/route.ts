import { NextRequest, NextResponse } from "next/server";
import { mergeChunks, getPublicUrl } from "@/lib/r2";
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
		const body = (await req.json()) as CompleteUploadRequest;

		console.log("[Complete Upload] Received body:", {
			uploadId: body.uploadId,
			slug: body.slug,
			filename: body.filename,
			filesize: body.filesize,
			mimeType: body.mimeType,
			domain: body.domain,
			expires: body.expires,
		});

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

		await mergeChunks(body.uploadId, finalKey, body.mimeType);

		const expiresAt = new Date(Date.now() + EXPIRES_MAP[body.expires]);

		console.log("[Complete Upload] Calculated expiresAt:", {
			expires: body.expires,
			expirationMs: EXPIRES_MAP[body.expires],
			expiresAt: expiresAt.toISOString(),
		});

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

		const url = getPublicUrl(body.slug, sanitizedFilename, body.domain || undefined);

		const response: UploadResponse = {
			id: upload.id,
			slug: upload.slug,
			url,
			expiresAt: upload.expiresAt.toISOString(),
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error completing upload:", error);
		return NextResponse.json<ErrorResponse>(
			{
				error: "Failed to complete upload",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}