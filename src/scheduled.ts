export default {
	async scheduled(event: ScheduledEvent, env: CloudflareEnv, ctx: ExecutionContext) {
		ctx.waitUntil(
			(async () => {
				try {
					const cronSecret = env.CRON_SECRET || process.env.CRON_SECRET;

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

					const data = await response.json();
					console.log("Cron clear executed:", data);
				} catch (error) {
					console.error("Error executing cron clear:", error);
				}
			})(),
		);
	},
} as ExportedHandler<CloudflareEnv>;