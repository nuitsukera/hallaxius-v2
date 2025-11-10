export interface Settings {
	webhook?: string;
}

const SETTINGS_STORAGE_KEY = "settings";

export function saveSettings(settings: Settings): {
	success: boolean;
	message: string;
} {
	try {
		if (!settings.webhook || settings.webhook.trim() === "") {
			return {
				success: false,
				message: "Webhook URL is required",
			};
		}

		try {
			new URL(settings.webhook);
		} catch {
			return {
				success: false,
				message: "Please enter a valid URL",
			};
		}

		if (!settings.webhook.includes("discord.com/api/webhooks/")) {
			return {
				success: false,
				message: "Please enter a valid Discord webhook URL",
			};
		}

		const settingsData = {
			settings: {
				webhook: settings.webhook.trim(),
			},
		};

		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsData));

		return {
			success: true,
			message: "Settings saved successfully",
		};
	} catch (error) {
		console.error("Error saving settings to localStorage:", error);
		return {
			success: false,
			message: "Error saving settings",
		};
	}
}

export function loadSettings(): Settings {
	try {
		const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return parsed.settings || {};
		}
	} catch (error) {
		console.error("Error loading settings from localStorage:", error);
	}
	return {};
}

export function getWebhook(): string | undefined {
	const settings = loadSettings();
	return settings.webhook;
}
