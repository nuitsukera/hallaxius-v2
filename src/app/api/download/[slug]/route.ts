import { type NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/api/download";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const slug = searchParams.get("slug");

		if (!slug) {
			return NextResponse.json({ error: "Slug is required" }, { status: 400 });
		}

		const response = await getFile(slug);

		return response;
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
