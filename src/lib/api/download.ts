import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const downloadTokens = new Map<
	string,
	{
		uploadId: string;
		slug: string;
		filename: string;
		expiresAt: Date;
	}
>();

function generateToken(): string {
	return randomBytes(32).toString("hex");
}

export async function createDownloadToken(uploadId: string) {
	try {
		const upload = await prisma.upload.findUnique({
			where: { id: uploadId },
			select: {
				id: true,
				slug: true,
				filename: true,
				expiresAt: true,
			},
		});

		if (!upload) {
			throw new Error("Upload not found");
		}

		if (new Date(upload.expiresAt) < new Date()) {
			throw new Error("File expired");
		}

		const token = generateToken();
		const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

		downloadTokens.set(token, {
			uploadId: upload.id,
			slug: upload.slug,
			filename: upload.filename,
			expiresAt: tokenExpiresAt,
		});

		cleanupExpiredTokens();

		return {
			token,
			expiresAt: tokenExpiresAt,
		};
	} catch (error) {
		throw error;
	}
}

export async function getFileWithToken(token: string) {
	try {
		const tokenData = downloadTokens.get(token);

		if (!tokenData) {
			return new Response(JSON.stringify({ error: "Invalid token" }), {
				status: 404,
			});
		}

		if (new Date(tokenData.expiresAt) < new Date()) {
			downloadTokens.delete(token);
			return new Response(JSON.stringify({ error: "Token expired" }), {
				status: 410,
			});
		}

		const record = await prisma.upload.findUnique({
			where: { id: tokenData.uploadId },
			select: {
				expiresAt: true,
			},
		});

		if (!record) {
			downloadTokens.delete(token);
			return new Response(JSON.stringify({ error: "File not found" }), {
				status: 404,
			});
		}

		if (new Date(record.expiresAt) < new Date()) {
			downloadTokens.delete(token);
			return new Response(JSON.stringify({ error: "File expired" }), {
				status: 410,
			});
		}

		const r2Url = `${process.env.R2_PUBLIC_BASE_URL}/${tokenData.slug}/${encodeURIComponent(tokenData.filename)}`;
		const fileResponse = await fetch(r2Url);

		if (!fileResponse.ok) {
			return new Response(JSON.stringify({ error: "Failed to fetch file" }), {
				status: 500,
			});
		}

		const headers = new Headers();
		headers.set(
			"Content-Disposition",
			fileResponse.headers.get("content-disposition") || "attachment",
		);
		fileResponse.headers.forEach((value, key) => {
			headers.set(key, value);
		});

		const body = await fileResponse.arrayBuffer();

		downloadTokens.delete(token);

		return new Response(body, {
			status: fileResponse.status,
			headers,
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
		});
	}
}

function cleanupExpiredTokens() {
	const now = new Date();
	for (const [token, data] of downloadTokens.entries()) {
		if (data.expiresAt < now) {
			downloadTokens.delete(token);
		}
	}
}

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
