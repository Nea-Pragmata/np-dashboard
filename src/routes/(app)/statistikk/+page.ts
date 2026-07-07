import { error, redirect } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	LinkEventsTypeOptions,
	type StatsOverviewResponse,
	type LinkEventsResponse,
	type ReportSettingsResponse,
	type BookingsResponse,
	type ProductsResponse
} from '$lib/pocketbase-types';
import { hasAnyModule } from '$lib/utils/modules';
import type { PageLoad } from './$types';

/** stats_overview counts come back as numbers (SQLite COUNT columns). */
type StatsResponse = StatsOverviewResponse<number, number, number, number>;

/** One day (or aggregated bucket) of the visits time series. */
export type DailyPoint = { label: string; value: number };
/** A traffic-source row: label, raw visit count, and share of total. */
export type SourceRow = { label: string; count: number; pct: number };
/** A booked-service tally. */
export type ServiceRow = { label: string; count: number };

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

// Compact x-axis date label, e.g. "7. juli".
const AXIS_FMT = new Intl.DateTimeFormat('nb-NO', {
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/** Resolve a `getFirstListItem` to null on 404 (no row yet); rethrow otherwise. */
async function firstOrNull<T>(promise: Promise<T>): Promise<T | null> {
	try {
		return await promise;
	} catch (e) {
		if (e instanceof ClientResponseError && e.status === 404) return null;
		throw e;
	}
}

/**
 * Bucket a referrer URL into one of the display sources. Empty referrer =
 * "Direkte"; anything we don't recognise falls into "Annet" (never fabricated).
 */
function sourceLabel(referrer: string): string {
	const r = referrer.trim().toLowerCase();
	if (!r) return 'Direkte';
	if (r.includes('google')) return 'Google-søk';
	if (r.includes('instagram')) return 'Instagram';
	if (r.includes('facebook') || r.includes('fb.com') || r.includes('fb.me')) return 'Facebook';
	return 'Annet';
}

/**
 * Load the Statistikk page for the active business:
 *   - KPI counts from `stats_overview`,
 *   - page-visit `link_events` over the last 30 days → a per-day time series and
 *     a traffic-source breakdown (both derived honestly from real rows),
 *   - bookings grouped by product → most-booked services (booking module only),
 *   - the `report_settings` row (may be missing for non-Frisør tenants).
 *
 * Statistikk is gated behind having at least one operational module — a pure
 * website tenant is bounced to Oversikt. Reads run in parallel with
 * `requestKey:null` through SvelteKit's `fetch`; a dead server → error(503).
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { business, modules } = await parent();
	if (!business) error(503, NETWORK_MESSAGE);
	// Gate: Statistikk requires any operational module (Bygg & Bo has none).
	if (!hasAnyModule(modules)) redirect(302, '/oversikt');

	const bid = business.id;
	const common = { requestKey: null, fetch } as const;

	// 30-day UTC window ending today (aligns with the UTC-literal seed + the
	// stats view's DATE('now') convention — see docs/LEDGER.md).
	const now = new Date();
	const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const windowStart = todayUTC - (WINDOW_DAYS - 1) * DAY_MS;
	const windowStartFilter = new Date(windowStart).toISOString().replace('T', ' ');

	try {
		const [stats, visitEvents, bookings, reportSettings] = await Promise.all([
			firstOrNull(
				pb
					.collection(Collections.StatsOverview)
					.getFirstListItem<StatsResponse>(`business = "${bid}"`, common)
			),
			pb.collection(Collections.LinkEvents).getFullList<LinkEventsResponse>({
				filter: `business = "${bid}" && type = "${LinkEventsTypeOptions.page_visit}" && created >= "${windowStartFilter}"`,
				fields: 'referrer,created',
				...common
			}),
			modules.booking
				? pb
						.collection(Collections.Bookings)
						.getFullList<BookingsResponse<{ product?: ProductsResponse }>>({
							filter: `business = "${bid}"`,
							expand: 'product',
							...common
						})
				: Promise.resolve(null),
			firstOrNull(
				pb
					.collection(Collections.ReportSettings)
					.getFirstListItem<ReportSettingsResponse>(`business = "${bid}"`, common)
			)
		]);

		// --- Daily visits time series (30 buckets, one per day) ---
		const daily: DailyPoint[] = Array.from({ length: WINDOW_DAYS }, (_, i) => ({
			label: AXIS_FMT.format(new Date(windowStart + i * DAY_MS)),
			value: 0
		}));
		for (const ev of visitEvents) {
			const t = Date.parse(ev.created);
			if (Number.isNaN(t)) continue;
			const idx = Math.floor((t - windowStart) / DAY_MS);
			if (idx >= 0 && idx < WINDOW_DAYS) daily[idx].value += 1;
		}
		const totalVisits = visitEvents.length;

		// --- Traffic-source breakdown ---
		const counts = new Map<string, number>();
		for (const ev of visitEvents) {
			const key = sourceLabel(ev.referrer ?? '');
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		const sources: SourceRow[] = [...counts.entries()]
			.map(([label, count]) => ({
				label,
				count,
				pct: totalVisits ? Math.round((count / totalVisits) * 100) : 0
			}))
			// Highest share first, but always keep "Annet" last.
			.sort((a, b) =>
				a.label === 'Annet' ? 1 : b.label === 'Annet' ? -1 : b.count - a.count
			);

		// --- Most-booked services (booking module only) ---
		let topServices: ServiceRow[] | null = null;
		if (bookings) {
			const tally = new Map<string, number>();
			for (const b of bookings) {
				const name = b.expand?.product?.name ?? 'Ukjent tjeneste';
				tally.set(name, (tally.get(name) ?? 0) + 1);
			}
			topServices = [...tally.entries()]
				.map(([label, count]) => ({ label, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 6);
		}

		return { stats, daily, totalVisits, sources, topServices, reportSettings };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
