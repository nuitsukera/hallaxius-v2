import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function generateSlug(): string {
	return nanoid(6);
}

export function generateUploadId(): string {
	return uuidv4();
}
