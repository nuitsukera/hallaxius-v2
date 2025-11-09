import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getPublicUrl, getR2Bucket } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import {
	isValidMimeType,
	sanitizeFilename,
	validateFileSize,
	MAX_FILE_SIZE,
	MIN_FILE_SIZE,
} from "@/lib/validation";
import { generateSlug } from "@/lib/utils";
import type { UploadResponse, ErrorResponse } from "@/types/uploads";
import { EXPIRES_MAP, DIRECT_UPLOAD_LIMIT } from "@/types/uploads";
import { getMediaDimensions, isMediaType } from "@/lib/media";

export async function POST(req: NextRequest) {
	try {
		const bucket = getR2Bucket();

		const searchParams = req.nextUrl.searchParams;
		const filename = searchParams.get("filename");
		const mimeType = searchParams.get("mimeType");
		const domain = searchParams.get("domain");
		const expires = searchParams.get("expires");
		const filesizeStr = searchParams.get("filesize");

		if (!filename || !mimeType || !expires || !filesizeStr) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing required parameters" },
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

		if (filesize > DIRECT_UPLOAD_LIMIT) {
			return NextResponse.json<ErrorResponse>(
				{
					error: "File too large for direct upload",
					details: "Use chunked upload for files larger than 10MB",
				},
				{ status: 400 },
			);
		}

		if (!validateFileSize(filesize, MAX_FILE_SIZE)) {
			return NextResponse.json<ErrorResponse>(
				{ error: "File too large" },
				{ status: 400 },
			);
		}

		if (filesize < MIN_FILE_SIZE) {
			return NextResponse.json<ErrorResponse>(
				{ error: "File too small" },
				{ status: 400 },
			);
		}

		if (!isValidMimeType(mimeType)) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Invalid file type" },
				{ status: 400 },
			);
		}

		if (!["1h", "1d", "7d", "30d"].includes(expires)) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Invalid expiration option" },
				{ status: 400 },
			);
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
			return NextResponse.json<ErrorResponse>(
				{ error: "Failed to generate unique slug" },
				{ status: 500 },
			);
		}

		const key = `${slug}/${sanitizedFilename}`;

		const arrayBuffer = await req.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		if (buffer.length !== filesize) {
			return NextResponse.json<ErrorResponse>(
				{
					error: "File size mismatch",
					details: `Expected ${filesize} bytes, got ${buffer.length}`,
				},
				{ status: 400 },
			);
		}

		await uploadToR2(bucket, key, buffer, mimeType);

		let width: number | undefined;
		let height: number | undefined;

		if (isMediaType(mimeType)) {
			const dimensions = await getMediaDimensions(buffer, mimeType);
			if (dimensions) {
				width = dimensions.width;
				height = dimensions.height;
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
				expiresAt,
			},
		});

		const url = getPublicUrl(slug, sanitizedFilename, domain || undefined);

		const response: UploadResponse = {
			id: upload.id,
			slug: upload.slug,
			url,
			expiresAt: upload.expiresAt.toISOString(),
			width: upload.width ?? undefined,
			height: upload.height ?? undefined,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Error in direct upload:", error);
		return NextResponse.json<ErrorResponse>(
			{
				error: "Failed to upload file",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
