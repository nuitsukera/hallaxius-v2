"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Settings, Trash2 } from "lucide-react";
import { saveSettings, loadSettings } from "@/lib/settings";
import { toast } from "sonner";

interface SettingsSheetProps {
	triggerClassName?: string;
}

export function SettingsSheet({ triggerClassName = "" }: SettingsSheetProps) {
	const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
	const [shouldDeleteWebhook, setShouldDeleteWebhook] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [hasSavedWebhook, setHasSavedWebhook] = useState(false);

	const SETTINGS_STORAGE_KEY = "settings";

	useEffect(() => {
		const settings = loadSettings();
		setDiscordWebhookUrl(settings.webhook || "");
		setHasSavedWebhook(!!settings.webhook);
		setShouldDeleteWebhook(false);
	}, []);

	const handleSave = async () => {
		setIsLoading(true);

		try {
			let result;

			if (shouldDeleteWebhook) {
				const settings = loadSettings();
				delete settings.webhook;
				localStorage.setItem(
					SETTINGS_STORAGE_KEY,
					JSON.stringify({ settings }),
				);

				result = {
					success: true,
					message: "Webhook removed successfully",
				};
				setHasSavedWebhook(false);
			} else {
				result = saveSettings({ webhook: discordWebhookUrl });
				if (result.success) {
					setHasSavedWebhook(true);
				}
			}

			if (result.success) {
				toast.success("Settings saved successfully!", {
					description: result.message,
				});
			} else {
				toast.error("Failed to save settings", {
					description: result.message,
				});
			}
		} catch (error) {
			toast.error("Error", {
				description: "An unexpected error occurred while saving settings.",
			});
		} finally {
			setIsLoading(false);
			setShouldDeleteWebhook(false);
		}
	};

	const handleCancel = () => {
		const settings = loadSettings();
		setDiscordWebhookUrl(settings.webhook || "");
		setShouldDeleteWebhook(false);
		setHasSavedWebhook(!!settings.webhook);

		toast.info("Changes cancelled", {
			description: "Your changes have been reverted.",
		});
	};

	const isSaveDisabled =
		(!discordWebhookUrl.trim() && !shouldDeleteWebhook) || isLoading;

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					className={`cursor-pointer hover:text-muted-foreground duration-300 ${triggerClassName}`}
				>
					<Settings className="w-5 h-5" />
					<span>Settings</span>
				</Button>
			</SheetTrigger>

			<SheetContent side="right" className="w-full max-w-md flex flex-col">
				<SheetHeader className="text-left px-6 pt-6">
					<SheetTitle>Settings</SheetTitle>
					<SheetDescription>
						Configure your Discord webhook settings.
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 px-6 py-6">
					<Accordion
						type="single"
						collapsible
						className="w-full"
						defaultValue="discord-settings"
					>
						<AccordionItem value="discord-settings">
							<AccordionTrigger>Discord Webhook</AccordionTrigger>
							<AccordionContent className="flex flex-col gap-4">
								<div className="grid gap-3">
									<Label htmlFor="discord-webhook" className="required">
										Webhook URL
									</Label>
									<div className="flex items-center gap-2">
										<Input
											id="discord-webhook"
											type="url"
											placeholder="https://discord.com/api/webhooks/..."
											value={discordWebhookUrl}
											onChange={(e) => {
												setDiscordWebhookUrl(e.target.value);
												setShouldDeleteWebhook(false);
											}}
											required
										/>
										{hasSavedWebhook && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => {
													setDiscordWebhookUrl("");
													setShouldDeleteWebhook(true);
												}}
											>
												<Trash2 className="w-4 h-4 text-red-500" />
											</Button>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										Discord webhook URL for notifications. Stored locally in
										your browser.
									</p>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>

				<div className="px-6 pb-6 mt-auto">
					<div className="flex flex-col gap-3">
						<Button
							onClick={handleSave}
							className="w-full"
							disabled={isSaveDisabled}
						>
							{isLoading ? "Saving..." : "Save"}
						</Button>
						<Button
							variant="outline"
							onClick={handleCancel}
							className="w-full"
							disabled={isLoading}
						>
							Cancel
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
