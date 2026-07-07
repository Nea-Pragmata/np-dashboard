/**
 * Page-local shared state for the Markedsføring («/markedsforing/[fane]») route.
 *
 * Keeps the tab catalogue, param validation, typed JSON shapes and a couple of
 * bokmål date helpers in one place so the loader, the shell and the tab
 * components agree. Kept co-located (not in `$lib`) per the parallel-build
 * protocol — no shared files are touched.
 */

import type { BusinessModules, ModuleKey } from '$lib/utils/modules';
import type {
	CampaignsResponse,
	LinkPagesResponse,
	LinksResponse,
	SocialPostsResponse,
	ContentTemplatesResponse,
	IntegrationStatusResponse
} from '$lib/pocketbase-types';

/** The four Markedsføring tabs, one per URL segment. */
export type Fane = 'kampanjer' | 'lenker' | 'sosiale-medier' | 'annonser';

export interface MarketingTab {
	fane: Fane;
	label: string;
	/** The `businesses.modules` key that gates this tab. */
	module: ModuleKey;
}

/** Tab order matches the Figma tab bar. */
export const MARKETING_TABS: readonly MarketingTab[] = [
	{ fane: 'kampanjer', label: 'Kampanjer', module: 'campaigns' },
	{ fane: 'lenker', label: 'Lenker', module: 'links' },
	{ fane: 'sosiale-medier', label: 'Sosiale medier', module: 'social' },
	{ fane: 'annonser', label: 'Annonser', module: 'ads' }
] as const;

/** Type guard: is `value` one of the four valid fane segments? */
export function isFane(value: string): value is Fane {
	return MARKETING_TABS.some((t) => t.fane === value);
}

/** The tab descriptor for a fane (assumes a validated fane). */
export function tabFor(fane: Fane): MarketingTab {
	return MARKETING_TABS.find((t) => t.fane === fane) as MarketingTab;
}

/** The tabs this tenant may see, given its enabled modules. */
export function availableTabs(modules: BusinessModules | null | undefined): MarketingTab[] {
	return MARKETING_TABS.filter((t) => Boolean(modules?.[t.module]));
}

// --- typed JSON field shapes ------------------------------------------------

/** `campaigns.audience` — a snapshot of the recipient segment at build time. */
export interface CampaignAudience {
	/** Number of recipients (customers with the matching consent). */
	count?: number;
	/** Consent channel the segment is built from. */
	consent?: 'email' | 'sms';
}

/** `campaigns.results` — filled by the (deferred) send hook, read-only here. */
export interface CampaignResults {
	open_rate?: number;
	clicks?: number;
	bookings?: number;
}

/** `link_pages.theme` — accent colour + light/dark preset. */
export interface LinkPageTheme {
	accent?: string;
	preset?: 'light' | 'dark';
}

export type CampaignRow = CampaignsResponse<CampaignAudience, CampaignResults>;
export type LinkPageRow = LinkPagesResponse<LinkPageTheme>;
export type LinkRow = LinksResponse;
export type SocialPostRow = SocialPostsResponse;
export type TemplateRow = ContentTemplatesResponse;
export type AdStatusRow = IntegrationStatusResponse;

/** Recipient counts per consent channel, for the Ny kampanje audience step. */
export interface RecipientCounts {
	email: number;
	sms: number;
}

// --- date helpers (bokmål) --------------------------------------------------
// format.ts is a shared file we must not edit; these two variants (day + long
// month, no weekday/year) are page-local. `formatTime` is reused from format.ts
// where a clock component is needed.

const dayMonthFmt = new Intl.DateTimeFormat('nb-NO', {
	day: 'numeric',
	month: 'long'
});

/** "28. juni" — numeric day + long month, no weekday, no year. */
export function formatDayMonth(value: string | number | Date): string {
	if (!value) return '—';
	return dayMonthFmt.format(value instanceof Date ? value : new Date(value));
}

const monthYearFmt = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' });

/** "juli 2026" — long month + year, for the calendar heading. */
export function formatMonthTitle(value: Date): string {
	return monthYearFmt.format(value);
}

// --- social media -----------------------------------------------------------

/** Channel abbreviation + full label for the two supported networks. */
export const CHANNEL_META = {
	instagram: { abbr: 'IG', label: 'Instagram' },
	facebook: { abbr: 'FB', label: 'Facebook' }
} as const;

/** Full channel label ("Instagram") with a safe fallback for unknown values. */
export function channelLabel(channel: string): string {
	return CHANNEL_META[channel as keyof typeof CHANNEL_META]?.label ?? channel;
}

/** Short channel tag ("IG") with a safe fallback for unknown values. */
export function channelAbbr(channel: string): string {
	return CHANNEL_META[channel as keyof typeof CHANNEL_META]?.abbr ?? channel.slice(0, 2).toUpperCase();
}

/** Monday-first weekday captions for the calendar header. */
export const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'] as const;

/** A single calendar cell: its date plus the posts scheduled on it. */
export interface CalendarDay {
	date: Date;
	day: number;
	inMonth: boolean;
	isToday: boolean;
	posts: SocialPostRow[];
}

/** Local YYYY-M-D key so a post lands in the right calendar cell. */
function dayKey(d: Date): string {
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Build a Monday-first month grid for `view`, bucketing `posts` into the day
 * their `scheduled_at` falls on. Rows are whole weeks; leading/trailing days
 * from neighbouring months fill the edges (marked `inMonth: false`).
 */
export function buildMonthMatrix(view: Date, posts: SocialPostRow[]): CalendarDay[][] {
	const year = view.getFullYear();
	const month = view.getMonth();
	const first = new Date(year, month, 1);
	const startOffset = (first.getDay() + 6) % 7; // Monday = 0
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const weeks = Math.ceil((startOffset + daysInMonth) / 7);

	const byDay = new Map<string, SocialPostRow[]>();
	for (const p of posts) {
		if (!p.scheduled_at) continue;
		const key = dayKey(new Date(p.scheduled_at));
		(byDay.get(key) ?? byDay.set(key, []).get(key)!).push(p);
	}

	const now = new Date();
	const todayKey = dayKey(now);

	const matrix: CalendarDay[][] = [];
	for (let w = 0; w < weeks; w++) {
		const row: CalendarDay[] = [];
		for (let d = 0; d < 7; d++) {
			const date = new Date(year, month, 1 - startOffset + w * 7 + d);
			const key = dayKey(date);
			row.push({
				date,
				day: date.getDate(),
				inMonth: date.getMonth() === month,
				isToday: key === todayKey,
				posts: byDay.get(key) ?? []
			});
		}
		matrix.push(row);
	}
	return matrix;
}
