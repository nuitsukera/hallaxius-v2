export interface WebhookEmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface WebhookEmbedAuthor {
	name: string;
	url?: string;
	icon_url?: string;
}

export interface WebhookEmbedFooter {
	text: string;
	icon_url?: string;
}

export interface WebhookEmbedThumbnail {
	url: string;
}

export interface WebhookEmbedImage {
	url: string;
}

export interface WebhookEmbed {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	timestamp?: string;
	fields?: WebhookEmbedField[];
	author?: WebhookEmbedAuthor;
	footer?: WebhookEmbedFooter;
	thumbnail?: WebhookEmbedThumbnail;
	image?: WebhookEmbedImage;
}

export interface WebhookPayload {
	content?: string;
	embeds?: WebhookEmbed[];
	username?: string;
	avatar_url?: string;
}
