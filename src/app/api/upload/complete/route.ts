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

		// Validações
		if (
			!body.uploadId ||
			!body.slug ||
			!body.filename ||
			!body.filesize ||
			!body.mimeType ||
			!body.domain ||
			!body.expires
		) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Sanitizar filename
		const sanitizedFilename = sanitizeFilename(body.filename);

		// Chave final no R2
		const finalKey = `${body.slug}/${sanitizedFilename}`;

		// Juntar todos os chunks em um arquivo final
		await mergeChunks(body.uploadId, finalKey, body.mimeType);

		// Calcular data de expiração
		const expiresAt = new Date(Date.now() + EXPIRES_MAP[body.expires]);

		// Salvar no banco de dados
		const upload = await prisma.upload.create({
			data: {
				slug: body.slug,
				filename: sanitizedFilename,
				filesize: body.filesize,
				mimeType: body.mimeType,
				domain: body.domain,
				expiresAt,
			},
		});

		// Gerar URL pública
		const url = getPublicUrl(body.slug, sanitizedFilename);

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
