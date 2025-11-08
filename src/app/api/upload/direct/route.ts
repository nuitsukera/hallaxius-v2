import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getPublicUrl } from "@/lib/r2";
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

export async function POST(req: NextRequest) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const filename = searchParams.get("filename");
		const mimeType = searchParams.get("mimeType");
		const domain = searchParams.get("domain");
		const expires = searchParams.get("expires");
		const filesizeStr = searchParams.get("filesize");

		// Validações
		if (!filename || !mimeType || !domain || !expires || !filesizeStr) {
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

		// Validar tamanho
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

		// Validar MIME type
		if (!isValidMimeType(mimeType)) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Invalid file type" },
				{ status: 400 },
			);
		}

		// Validar expires
		if (!["1h", "1d", "7d", "30d"].includes(expires)) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Invalid expiration option" },
				{ status: 400 },
			);
		}

		// Sanitizar filename
		const sanitizedFilename = sanitizeFilename(filename);

		// Gerar slug único
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

		// Chave no R2
		const key = `${slug}/${sanitizedFilename}`;

		// Obter o corpo da requisição como ArrayBuffer
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

		// Fazer upload direto para o R2
		await uploadToR2(key, buffer, mimeType);

		// Calcular data de expiração
		const expiresAt = new Date(
			Date.now() + EXPIRES_MAP[expires as keyof typeof EXPIRES_MAP],
		);

		// Salvar no banco de dados
		const upload = await prisma.upload.create({
			data: {
				slug,
				filename: sanitizedFilename,
				filesize,
				mimeType,
				domain,
				expiresAt,
			},
		});

		// Gerar URL pública
		const url = getPublicUrl(slug, sanitizedFilename);

		const response: UploadResponse = {
			id: upload.id,
			slug: upload.slug,
			url,
			expiresAt: upload.expiresAt.toISOString(),
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
