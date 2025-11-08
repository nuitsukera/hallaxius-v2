import { NextRequest, NextResponse } from "next/server";
import {
	getR2Bucket,
	getMultipartUploadState,
	resumeMultipartUpload,
	deleteMultipartUploadState,
} from "@/lib/r2";
import type { ErrorResponse } from "@/types/uploads";

export async function POST(req: NextRequest) {
	try {
		const bucket = getR2Bucket();

		const { uploadId } = (await req.json()) as { uploadId: string };

		if (!uploadId) {
			return NextResponse.json<ErrorResponse>(
				{ error: "Missing uploadId" },
				{ status: 400 },
			);
		}

		const state = await getMultipartUploadState(bucket, uploadId);

		if (state) {
			try {
				const multipartUpload = await resumeMultipartUpload(
					bucket,
					state.key,
					state.multipartUploadId,
				);
				await multipartUpload.abort();
			} catch (error) {
				console.error("Error aborting multipart upload:", error);
			}

			await deleteMultipartUploadState(bucket, uploadId);
		}
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error cancelling upload:", error);
		return NextResponse.json<ErrorResponse>(
			{
				error: "Failed to cancel upload",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
