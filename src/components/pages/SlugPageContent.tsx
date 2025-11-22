"use client";

import { useEffect, useState } from "react";
import ErrorPage from "@/components/pages/ErrorPage";
import FileViewPage from "@/components/pages/FileViewPage";
import { getFileUrl } from "@/lib/url";
import Loading from "@/components/ui/loading";
import type {
	SlugPageContentProps,
	UploadRecord,
	ApiResponse,
} from "@/types/uploads";
import { AnimatePresence } from "framer-motion";
import { FadeInUp, StaggerContainer } from "../animations";

interface UploadRecordWithId extends UploadRecord {
	id: string;
}

export function SlugPageContent({ params }: SlugPageContentProps) {
	const [record, setRecord] = useState<UploadRecordWithId | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const { slug } = params;

				if (!slug) {
					setError("This file does not exist or has expired.");
					setLoading(false);
					return;
				}

				const response = await fetch(`/api/upload/${slug}`);
				const data: ApiResponse & { record?: UploadRecordWithId } =
					await response.json();

				if (!response.ok || !data.success) {
					setError(data.error || "This file does not exist or has expired.");
					setLoading(false);
					return;
				}

				if (data.record) {
					if (data.record.expiresAt) {
						const expiresAt = new Date(data.record.expiresAt);
						if (expiresAt < new Date()) {
							setError("This file does not exist or has expired.");
							setLoading(false);
							return;
						}
					}
					setRecord(data.record);
				}
			} catch (err) {
				console.error(err);
				setError("An error occurred while fetching the file.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [params]);

	return (
		<AnimatePresence>
			{loading && <Loading key="loading" />}

			{!loading && (
				<>
					{error && <ErrorPage title="Not found" description={error} />}

					{!error && !record && (
						<ErrorPage
							title="Not found"
							description="This file does not exist or has expired."
						/>
					)}

					{!error && record && (
						<div className="min-h-screen flex flex-col">
							<StaggerContainer className="flex-1 overflow-hidden">
								<FadeInUp className="h-full">
									<FileViewPage
										slug={record.slug}
										filename={record.filename}
										fileUrl={getFileUrl(record.slug, record.filename)}
										mimeType={record.mimeType}
										filesize={record.filesize || 0}
										uploadAt={new Date(record.uploadAt)}
										expiresAt={new Date(record.expiresAt || new Date())}
										uploadId={record.id}
									/>
								</FadeInUp>
							</StaggerContainer>
						</div>
					)}
				</>
			)}
		</AnimatePresence>
	);
}
