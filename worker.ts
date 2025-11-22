// @ts-expect-error `.open-next/worker.ts` is generated at build time
import { default as handler } from "./.open-next/worker.js";

export default {
	fetch: handler.fetch,

	async scheduled(
		controller: ScheduledController,
		env: CloudflareEnv,
		ctx: ExecutionContext,
	) {
		console.log(
			`Cron triggered: ${controller.cron} at ${new Date(controller.scheduledTime).toISOString()}`,
		);

		ctx.waitUntil(
			(async () => {
				try {
					const cronSecret = env.CRON_SECRET;

					if (!cronSecret) {
						console.error("CRON_SECRET not set");
						return;
					}

					const url = "https://hallaxi.us/api/cron/clear";
					const response = await fetch(url, {
						method: "GET",
						headers: {
							Authorization: `Bearer ${cronSecret}`,
						},
					});

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					const data = await response.json();
					console.log("Cron clear executed successfully:", data);
				} catch (error) {
					console.error("Error executing cron clear:", error);
					throw error;
				}
			})(),
		);
	},
} satisfies ExportedHandler<CloudflareEnv>;

// @ts-expect-error `.open-next/worker.ts` is generated at build time
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
