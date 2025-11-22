import { type NextRequest, NextResponse } from "next/server";
import { createDownloadToken } from "@/lib/api/download";

interface RequestBody {
	uploadId: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as RequestBody;
		const { uploadId } = body;

		if (!uploadId) {
			return NextResponse.json(
				{ error: "uploadId is required" },
				{ status: 400 },
			);
		}

		const tokenData = await createDownloadToken(uploadId);

		return NextResponse.json({
			success: true,
			token: tokenData.token,
			expiresAt: tokenData.expiresAt,
		});
	} catch (error: any) {
		if (error.message === "Upload not found") {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		if (error.message === "File expired") {
			return NextResponse.json({ error: "File expired" }, { status: 410 });
		}

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
