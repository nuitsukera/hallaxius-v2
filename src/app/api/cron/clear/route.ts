import { type NextRequest, NextResponse } from "next/server";
import { executeCleanup } from "@/lib/api/cron/clear";
import { getR2Bucket } from "@/lib/r2";

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	const token = authHeader?.split(" ")[1];

	if (!token || token !== process.env.CRON_SECRET) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const bucket = getR2Bucket();
		const result = await executeCleanup(bucket);
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error during cleanup cron:", error);
		return NextResponse.json(
			{
				error: "Error executing cleanup",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
