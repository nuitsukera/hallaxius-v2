import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;

		const record = await prisma.upload.findUnique({
			where: { slug },
			select: {
				filename: true,
				expiresAt: true,
			},
		});

		if (!record) {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		const isExpired =
			record.expiresAt && new Date(record.expiresAt) < new Date();
		if (isExpired) {
			return NextResponse.json({ error: "File expired" }, { status: 410 });
		}

		const r2Url = `${process.env.R2_PUBLIC_BASE_URL}/${slug}/${encodeURIComponent(record.filename)}`;

		const fileResponse = await fetch(r2Url);

		if (!fileResponse.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch file" },
				{ status: 500 },
			);
		}

		const headers = new Headers();
		headers.set(
			"Content-Disposition",
			`attachment; filename="${encodeURIComponent(record.filename)}"`,
		);
		headers.set(
			"Content-Type",
			fileResponse.headers.get("Content-Type") || "application/octet-stream",
		);

		if (fileResponse.headers.get("Content-Length")) {
			headers.set(
				"Content-Length",
				fileResponse.headers.get("Content-Length") || "",
			);
		}

		return new NextResponse(fileResponse.body, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Download error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
