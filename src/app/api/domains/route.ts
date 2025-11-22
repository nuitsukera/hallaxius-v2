import { NextResponse } from "next/server";
import { getFormattedDomains } from "@/lib/api/domains";

export async function GET() {
	try {
		const formattedDomains = await getFormattedDomains();
		return NextResponse.json(formattedDomains);
	} catch (error) {
		console.error("Error fetching domains:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to fetch domains";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
