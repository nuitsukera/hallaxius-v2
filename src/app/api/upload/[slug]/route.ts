import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await context.params;

		if (!slug || typeof slug !== "string") {
			return NextResponse.json(
				{ success: false, error: "Invalid slug" },
				{ status: 400 },
			);
		}

		const record = await prisma.upload.findUnique({
			where: { slug },
			select: {
				slug: true,
				filename: true,
				domain: true,
				expiresAt: true,
				mimeType: true,
				filesize: true,
				uploadAt: true,
			},
		});

		if (!record) {
			return NextResponse.json(
				{ success: false, error: "This file does not exist or has expired." },
				{ status: 404 },
			);
		}

		const isExpired =
			record.expiresAt && new Date(record.expiresAt) < new Date();
		if (isExpired) {
			return NextResponse.json(
				{ success: false, error: "This file does not exist or has expired." },
				{ status: 404 },
			);
		}

		const currentDomain = request.headers.get("host");
		if (record.domain && currentDomain) {
			const recordDomain = record.domain.toLowerCase();
			const requestDomain = currentDomain.toLowerCase();

			if (recordDomain !== requestDomain) {
				return NextResponse.json(
					{ success: false, error: "This file does not exist or has expired." },
					{ status: 404 },
				);
			}
		}

		return NextResponse.json({
			success: true,
			record,
		});
	} catch (error) {
		console.error("API Error:", error);

		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
