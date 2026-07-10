/**
 * Route-local helpers for the Pakker & priser page. Kept out of the shared
 * `format.ts` (owned elsewhere): agency-catalog specifics — add-on price-type
 * labels, campaign discount / period / status formatting, the package
 * default-modules checkbox set, and the computed monthly subscription price.
 */
import { formatKr, formatNumber } from '$lib/utils/format';
import { MODULE_KEYS, MODULE_LABELS } from '$lib/utils/modules';
import {
	AddonServicesPriceTypeOptions,
	AgencyCampaignsDiscountTypeOptions,
	SubscriptionsBillingIntervalOptions
} from '$lib/pocketbase-types';
import type { StatusTone } from '$lib/components/shared/StatusBadge.svelte';

/** All module keys with their labels, in canonical order. */
export const MODULE_META = MODULE_KEYS.map((key) => ({ key, label: MODULE_LABELS[key] }));

/** Add-on price-type choices for the drawer select. */
export const PRICE_TYPE_OPTIONS = [
	{ value: AddonServicesPriceTypeOptions.monthly, label: 'Per måned' },
	{ value: AddonServicesPriceTypeOptions.one_time, label: 'Engangs' }
] as const;

/** «Per måned» / «Engangs» for an `addon_services.price_type` value. */
export function priceTypeLabel(type: string): string {
	return type === AddonServicesPriceTypeOptions.one_time ? 'Engangs' : 'Per måned';
}

/** Discount-type choices for the campaign drawer select. */
export const DISCOUNT_TYPE_OPTIONS = [
	{ value: AgencyCampaignsDiscountTypeOptions.percent, label: 'Prosent (%)' },
	{ value: AgencyCampaignsDiscountTypeOptions.amount, label: 'Kronebeløp (kr)' }
] as const;

/** Discount summary: percent → «−50 %», amount → «−4 900 kr». */
export function discountLabel(type: string, value: number): string {
	if (type === AgencyCampaignsDiscountTypeOptions.percent) return `−${formatNumber(value)} %`;
	return `−${formatKr(value)}`;
}

// Campaign dates are stored as UTC calendar instants (a «valid_to» sits at
// 23:59:59Z of the last day). Format in UTC so «31. august» doesn't roll over to
// «1. september» in a +01/+02 timezone.
const dayMonthFormatter = new Intl.DateTimeFormat('nb-NO', {
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});
const monthYearFormatter = new Intl.DateTimeFormat('nb-NO', {
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function isLastDayOfMonthUTC(d: Date): boolean {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).getUTCDate() === 1;
}

/**
 * Campaign period: a whole calendar month → «April 2026», otherwise a day range
 * «1. juni – 31. august». Invalid/missing dates render «—». All comparisons and
 * formatting run in UTC (see the formatters above).
 */
export function campaignPeriodLabel(from?: string, to?: string): string {
	if (!from || !to) return '—';
	const f = new Date(from);
	const t = new Date(to);
	if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return '—';
	const wholeMonth =
		f.getUTCDate() === 1 &&
		isLastDayOfMonthUTC(t) &&
		f.getUTCMonth() === t.getUTCMonth() &&
		f.getUTCFullYear() === t.getUTCFullYear();
	if (wholeMonth) return capitalize(monthYearFormatter.format(f));
	return `${dayMonthFormatter.format(f)} – ${dayMonthFormatter.format(t)}`;
}

type StatusMeta = { label: string; tone: StatusTone };

/**
 * Campaign status derived from its validity window vs. today: before start →
 * «Planlagt», within → «Aktiv», past → «Avsluttet».
 */
export function campaignStatusMeta(from?: string, to?: string, now: Date = new Date()): StatusMeta {
	const f = from ? new Date(from) : null;
	const t = to ? new Date(to) : null;
	if (t && !Number.isNaN(t.getTime()) && now.getTime() > t.getTime())
		return { label: 'Avsluttet', tone: 'neutral' };
	if (f && !Number.isNaN(f.getTime()) && now.getTime() < f.getTime())
		return { label: 'Planlagt', tone: 'info' };
	return { label: 'Aktiv', tone: 'success' };
}

/** Tone → NP badge classes — re-exported from StatusBadge so the palette lives in one place. */
export { TONE_CLASS as TONE_BADGE } from '$lib/components/shared/StatusBadge.svelte';

/** Billing-interval choices for the subscription drawer select. */
export const INTERVAL_OPTIONS = [
	{ value: SubscriptionsBillingIntervalOptions.month, label: 'Per måned' },
	{ value: SubscriptionsBillingIntervalOptions.year, label: 'Per år' }
] as const;

/** «/md» or «/år» suffix for a `subscriptions.billing_interval` value (missing → monthly). */
export function intervalSuffix(interval?: string): string {
	return interval === SubscriptionsBillingIntervalOptions.year ? '/år' : '/md';
}

/**
 * Recurring price for the chosen billing interval. `monthlyBase` is the pure
 * per-month figure (see `computeMonthly` with no override). A positive
 * `override` is the final agreed price for the interval and wins outright;
 * otherwise a yearly interval is 12× the monthly base. Missing interval → monthly.
 */
export function computeRecurring(
	monthlyBase: number | null,
	interval?: string,
	override?: number | null
): number | null {
	if (override != null && override > 0) return override;
	if (monthlyBase == null) return null;
	return interval === SubscriptionsBillingIntervalOptions.year ? monthlyBase * 12 : monthlyBase;
}

/** One-time startup total: the agency setup fee + any one-time add-ons. */
export function computeOneTime(addons: PricedAddon[], setupFee?: number | null): number {
	const oneTimeAddons = addons
		.filter((a) => a.price_type === AddonServicesPriceTypeOptions.one_time)
		.reduce((sum, a) => sum + (a.price ?? 0), 0);
	return (setupFee && setupFee > 0 ? setupFee : 0) + oneTimeAddons;
}

/** A priced add-on, for the monthly-total computation. */
export interface PricedAddon {
	price: number;
	price_type: string;
}

/** A campaign's discount inputs, for the monthly-total computation. */
export interface AppliedDiscount {
	discount_type: string;
	discount_value: number;
}

/**
 * Monthly price for a subscription (package + recurring add-ons − campaign
 * discount). A positive `price_override` wins outright (a manually agreed price).
 * Only `monthly` add-ons count toward the recurring figure; one-time add-ons are
 * billed separately. Returns `null` when the package price is unknown (e.g. an
 * unpublished package the agency API can't read).
 */
export function computeMonthly(
	packagePrice: number | null,
	addons: PricedAddon[],
	discount: AppliedDiscount | null,
	priceOverride?: number | null
): number | null {
	if (priceOverride != null && priceOverride > 0) return priceOverride;
	if (packagePrice == null) return null;
	const recurringAddons = addons
		.filter((a) => a.price_type === AddonServicesPriceTypeOptions.monthly)
		.reduce((sum, a) => sum + (a.price ?? 0), 0);
	let total = packagePrice + recurringAddons;
	if (discount) {
		if (discount.discount_type === AgencyCampaignsDiscountTypeOptions.percent) {
			total = total * (1 - (discount.discount_value ?? 0) / 100);
		} else {
			total = total - (discount.discount_value ?? 0);
		}
	}
	return Math.max(0, Math.round(total));
}
