import { prisma } from "@/lib/prisma";

export async function getFile(slug: string) {
	try {
		const record = await prisma.upload.findUnique({
			where: { slug },
			select: {
				filename: true,
				expiresAt: true,
			},
		});

		if (!record) {
			return new Response(JSON.stringify({ error: "File not found" }), {
				status: 404,
			});
		}

		const isExpired =
			record.expiresAt && new Date(record.expiresAt) < new Date();
		if (isExpired) {
			return new Response(JSON.stringify({ error: "File expired" }), {
				status: 410,
			});
		}

		const r2Url = `${process.env.R2_PUBLIC_BASE_URL}/${slug}/${encodeURIComponent(record.filename)}`;

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

		return new Response(body, {
			status: fileResponse.status,
			headers,
		});
	} catch (error) {
		console.error("Download error:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
		});
	}
}
