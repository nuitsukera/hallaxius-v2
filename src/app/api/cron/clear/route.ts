import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromR2, getR2Bucket } from "@/lib/r2";

export async function GET(req: NextRequest) {
	try {
		const bucket = getR2Bucket();

		const authHeader = req.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;

		if (!cronSecret) {
			console.error("CRON_SECRET not configured");
			return NextResponse.json(
				{ error: "CRON_SECRET not configured" },
				{ status: 500 },
			);
		}

		if (authHeader !== `Bearer ${cronSecret}`) {
			console.error("Invalid CRON_SECRET");
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const expiredUploads = await prisma.upload.findMany({
			where: {
				expiresAt: {
					lt: new Date(),
				},
			},
			select: {
				id: true,
				slug: true,
				filename: true,
			},
		});

		if (expiredUploads.length === 0) {
			console.log("No expired files found");
			return NextResponse.json({
				success: true,
				message: "No expired files found",
				deleted: 0,
			});
		}

		console.log(`Found ${expiredUploads.length} expired files`);

		const results = await Promise.allSettled(
			expiredUploads.map(
				async (upload: { id: string; slug: string; filename: string }) => {
					try {
						const key = `${upload.slug}/${upload.filename}`;
						await deleteFromR2(bucket, key);

						await prisma.upload.delete({
							where: { id: upload.id },
						});

						console.log(`File ${key} deleted successfully`);
						return { success: true, key };
					} catch (error) {
						console.error(`Error deleting ${upload.slug}:`, error);
						return { success: false, key: upload.slug, error };
					}
				},
			),
		);

		const succeeded = results.filter(
			(r: PromiseSettledResult<unknown>) => r.status === "fulfilled",
		).length;
		const failed = results.filter(
			(r: PromiseSettledResult<unknown>) => r.status === "rejected",
		).length;

		console.log(`Cleanup completed: ${succeeded} succeeded, ${failed} failed`);

		return NextResponse.json({
			success: true,
			message: "Cleanup completed",
			total: expiredUploads.length,
			succeeded,
			failed,
		});
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
