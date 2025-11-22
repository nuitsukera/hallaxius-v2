import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

export async function executeCleanup(bucket: R2Bucket): Promise<{
	success: boolean;
	message: string;
	total: number;
	succeeded: number;
	failed: number;
}> {
	try {
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
				thumbnail: true,
			},
		});

		if (expiredUploads.length === 0) {
			console.log("No expired files found");
			return {
				success: true,
				message: "No expired files found",
				total: 0,
				succeeded: 0,
				failed: 0,
			};
		}

		console.log(`Found ${expiredUploads.length} expired files`);

		const results = await Promise.allSettled(
			expiredUploads.map(
				async (upload: {
					id: string;
					slug: string;
					filename: string;
					thumbnail: string | null;
				}) => {
					try {
						const key = `${upload.slug}/${upload.filename}`;
						await deleteFromR2(bucket, key);

						if (upload.thumbnail) {
							await deleteFromR2(bucket, upload.thumbnail);
						}

						await cleanupTempFiles(bucket, upload.slug);

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

		return {
			success: true,
			message: "Cleanup completed",
			total: expiredUploads.length,
			succeeded,
			failed,
		};
	} catch (error) {
		console.error("Error during cleanup cron:", error);
		throw new Error(error instanceof Error ? error.message : "Unknown error");
	}
}

async function cleanupTempFiles(bucket: R2Bucket, slug: string): Promise<void> {
	try {
		const tempObjects = await bucket.list({ prefix: `${slug}/temp/` });

		if (tempObjects.objects && tempObjects.objects.length > 0) {
			const deletePromises = tempObjects.objects.map((obj) =>
				bucket.delete(obj.key),
			);
			await Promise.all(deletePromises);
		}

		const thumbnailObjects = await bucket.list({
			prefix: `${slug}/thumbnail/`,
		});

		if (thumbnailObjects.objects && thumbnailObjects.objects.length > 0) {
			const deletePromises = thumbnailObjects.objects.map((obj) =>
				bucket.delete(obj.key),
			);
			await Promise.all(deletePromises);
		}
	} catch (error) {
		console.error("Error cleaning up temp files:", error);
	}
}
