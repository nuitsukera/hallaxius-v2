import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

function createPrismaClient() {
	const client = new PrismaClient({
		log:
			process.env.NEXTJS_ENV === "production"
				? ["error"]
				: ["query", "error", "warn"],
	}).$extends(withAccelerate());

	return client;
}

const globalForPrisma = globalThis as unknown as {
	prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NEXTJS_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

export type PrismaClientType = typeof prisma;
