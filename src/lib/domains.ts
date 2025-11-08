import type { DomainOption } from "@/types/uploads";

const DOMAINS_CACHE_KEY = "domains";

export function getCachedDomains(): DomainOption[] | null {
	if (typeof window === "undefined") return null;
	
	try {
		const cached = localStorage.getItem(DOMAINS_CACHE_KEY);
		if (!cached) return null;
		
		return JSON.parse(cached) as DomainOption[];
	} catch (error) {
		console.error("Error reading domains from cache:", error);
		return null;
	}
}

export function setCachedDomains(domains: DomainOption[]): void {
	if (typeof window === "undefined") return;
	
	try {
		localStorage.setItem(DOMAINS_CACHE_KEY, JSON.stringify(domains));
	} catch (error) {
		console.error("Error saving domains to cache:", error);
	}
}

export function clearCachedDomains(): void {
	if (typeof window === "undefined") return;
	
	try {
		localStorage.removeItem(DOMAINS_CACHE_KEY);
	} catch (error) {
		console.error("Error clearing domains cache:", error);
	}
}

export async function fetchDomains(): Promise<DomainOption[]> {
	const response = await fetch("/api/domains");
	
	if (!response.ok) {
		throw new Error("Failed to fetch domains");
	}
	
	return await response.json();
}

export async function getDomains(): Promise<DomainOption[]> {
	const cached = getCachedDomains();
	if (cached) {
		return cached;
	}
	
	const domains = await fetchDomains();
	setCachedDomains(domains);
	return domains;
}

export async function refreshDomains(): Promise<DomainOption[]> {
	clearCachedDomains();
	const domains = await fetchDomains();
	setCachedDomains(domains);
	return domains;
}