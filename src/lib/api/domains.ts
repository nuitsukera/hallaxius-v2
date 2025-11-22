import { prisma } from "@/lib/prisma";

export async function getFormattedDomains(): Promise<
	{ id: string; value: string; label: string }[]
> {
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
		});

		return domains.map(
			(d: { id: string; domain: string; subdomain: string | null }) => ({
				id: d.id,
				value: d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain,
				label: d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain,
			}),
		);
	} catch (error) {
		console.error("Error fetching domains:", error);
		throw new Error("Failed to fetch domains");
	}
}
