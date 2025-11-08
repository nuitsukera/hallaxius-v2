import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const domains = await prisma.domain.findMany({
			select: {
				id: true,
				domain: true,
				subdomain: true,
			},
			orderBy: {
				domain: "asc",
			},
		}) as Array<{ id: string; domain: string; subdomain: string | null }>;

		const formattedDomains = domains.map((d) => ({
			id: d.id,
			value: d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain,
			label: d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain,
		}));

		return NextResponse.json(formattedDomains);
	} catch (error) {
		console.error("Error fetching domains:", error);
		const errorMessage = error instanceof Error ? error.message : "Failed to fetch domains";
		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 },
		);
	}
}