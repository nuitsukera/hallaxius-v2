import { getWebhook } from "@/lib/settings";
import { getFileUrl } from "@/lib/url";
import type { WebhookPayload } from "@/types/webhook";

export async function sendWebhookNotification(
	fileUrl: string,
	filename: string,
	fileSize: number,
	slug: string,
): Promise<boolean> {
	const webhookUrl = getWebhook();

	if (!webhookUrl) {
		console.log("No webhook configured, skipping notification");
		return false;
	}

	try {
		const imageUrl = getFileUrl(slug, filename) + "?thumb=1";

		const payload: WebhookPayload = {
			username: "Hallaxius",
			avatar_url: "https://hallaxi.us/favicon.webp",
			embeds: [
				{
					title: filename,
					fields: [
						{
							name: "URL",
							value: `\`\`\`${fileUrl}\`\`\``,
						},
					],

					image: {
						url: imageUrl,
					},
					timestamp: new Date().toISOString(),
				},
			],
		};

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			console.error(
				"Failed to send webhook notification:",
				response.status,
				response.statusText,
			);
			return false;
		}

		console.log("Webhook notification sent successfully");
		return true;
	} catch (error) {
		console.error("Error sending webhook notification:", error);
		return false;
	}
}

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = bytes / Math.pow(k, i);
	const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
	return `${formattedSize} ${sizes[i]}`;
};
