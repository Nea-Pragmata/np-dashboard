/**
 * Route-local helpers for the Onboarding flow. Kept out of the shared `format.ts`
 * (owned elsewhere): these are specific to creating a new customer — the business
 * type options, the module checkbox labels, and small id/password generators for
 * the atomic create batch.
 */
import { BusinessesTypeOptions } from '$lib/pocketbase-types';
import { MODULE_KEYS, type ModuleKey } from '$lib/utils/modules';

/** Bransje choices for the «Om kunden» select, in Figma order. */
export const BUSINESS_TYPE_OPTIONS = [
	{ value: BusinessesTypeOptions.frisor, label: 'Frisør' },
	{ value: BusinessesTypeOptions.bilforhandler, label: 'Bilforhandler' },
	{ value: BusinessesTypeOptions.tomrer, label: 'Tømrer' },
	{ value: BusinessesTypeOptions.annet, label: 'Annet' }
] as const;

/** Norwegian label per operational module key (MODULE_KEYS order). */
export const MODULE_LABELS: Record<ModuleKey, string> = {
	booking: 'Booking',
	catalog: 'Katalog',
	inquiries: 'Henvendelser',
	customers: 'Kunder & lojalitet',
	campaigns: 'Kampanjer',
	links: 'Lenker',
	social: 'Sosiale medier',
	ads: 'Annonser',
	reviews: 'Anmeldelser',
	waitlist: 'Venteliste'
};

/** A full `businesses.modules` record with every key set to `false`. */
export function emptyModules(): Record<ModuleKey, boolean> {
	const out = {} as Record<ModuleKey, boolean>;
	for (const key of MODULE_KEYS) out[key] = false;
	return out;
}

/**
 * Turn a package's `default_modules` (a JSON array of key strings) into a full
 * `businesses.modules` record — every key present as a boolean so toggling and
 * the menu preview stay in sync.
 */
export function modulesFromPackage(
	defaults: readonly string[] | null | undefined
): Record<ModuleKey, boolean> {
	const set = new Set(defaults ?? []);
	const out = {} as Record<ModuleKey, boolean>;
	for (const key of MODULE_KEYS) out[key] = set.has(key);
	return out;
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * A PocketBase-shaped record id (15 lowercase alphanumerics). Generated up front
 * so the business, its owner and its subscription can be linked inside a single
 * atomic create batch (no id-chaining across batch requests).
 */
export function generateRecordId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	let out = '';
	for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
	return out;
}

/** A throwaway strong password for an agency-created owner (they reset via invite). */
export function generatePassword(): string {
	return `${crypto.randomUUID()}Aa1!`;
}
