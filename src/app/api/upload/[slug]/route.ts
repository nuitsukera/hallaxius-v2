import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUploadInfo } from "@/lib/api/uploads";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await context.params;
		const currentDomain = request.headers.get("host") || undefined;

		const result = await getUploadInfo({ slug, currentDomain });

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: result.status },
			);
		}

		return NextResponse.json(
			{
				success: true,
				record: result.data,
			},
			{ status: result.status },
		);
	} catch (error) {
		console.error("API Error:", error);

		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
