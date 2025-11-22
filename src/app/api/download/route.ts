import { type NextRequest, NextResponse } from "next/server";
import { getFileWithToken } from "@/lib/api/download";

export async function GET(req: NextRequest) {
	try {
		const token = req.headers.get("x-download-token");

		if (!token) {
			return NextResponse.json({ error: "Token is required" }, { status: 400 });
		}

		const response = await getFileWithToken(token);
		return response;
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
