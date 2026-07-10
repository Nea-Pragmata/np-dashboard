import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	ReviewsStatusOptions,
	type StatsOverviewResponse,
	type SiteStatusResponse,
	type BookingsResponse,
	type ProductsResponse,
	type CustomersResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** stats_overview counts come back as numbers (SQLite COUNT columns). */
type StatsResponse = StatsOverviewResponse<number, number, number, number>;

/** A booking row with its product (and, when known, customer) expanded. */
export type TodayBooking = BookingsResponse<{
	product: ProductsResponse;
	customer?: CustomersResponse;
}>;

/**
 * PocketBase surfaces an unreachable server as a ClientResponseError with a
 * falsy status (the request never received an HTTP response).
 */

/**
 * Resolve a `getFirstListItem` read to `null` on 404 (no row yet) while letting
 * network/other failures propagate to the caller's error handling.
 */
async function firstOrNull<T>(promise: Promise<T>): Promise<T | null> {
	try {
		return await promise;
	} catch (e) {
		if (e instanceof ClientResponseError && e.status === 404) return null;
		throw e;
	}
}

/**
 * Load the Oversikt dashboard for the active business:
 *   - KPI counts from the `stats_overview` view,
 *   - today's bookings (for the schedule + "venter på bekreftelse" follow-up),
 *   - the count of reviews awaiting a reply,
 *   - website health from `site_status`.
 *
 * Only collections the tenant's enabled modules cover are queried; a pure
 * website tenant (no operational modules) reads just stats + site status. All
 * reads run in parallel with `requestKey:null` so they never auto-cancel each
 * other, and route through SvelteKit's `fetch`. A dead server → error(503).
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);

	const bid = business.id;
	const common = { requestKey: null, fetch } as const;

	// Today's UTC day window — matches the stats view's SQLite DATE('now').
	const now = new Date();
	const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const dayEnd = new Date(dayStart.getTime() + 86_400_000);
	const asFilter = (d: Date) => d.toISOString().replace('T', ' ');

	try {
		const [stats, todayBookings, newReviews, siteStatus] = await Promise.all([
			firstOrNull(
				pb
					.collection(Collections.StatsOverview)
					.getFirstListItem<StatsResponse>(`business = "${bid}"`, common)
			),
			modules.booking
				? pb.collection(Collections.Bookings).getFullList<TodayBooking>({
						filter: `business = "${bid}" && start >= "${asFilter(dayStart)}" && start < "${asFilter(dayEnd)}"`,
						expand: 'product,customer',
						sort: 'start',
						...common
					})
				: Promise.resolve(null),
			modules.reviews
				? pb.collection(Collections.Reviews).getList(1, 1, {
						filter: `business = "${bid}" && status = "${ReviewsStatusOptions.new}"`,
						fields: 'id',
						...common
					})
				: Promise.resolve(null),
			firstOrNull(
				pb
					.collection(Collections.SiteStatus)
					.getFirstListItem<SiteStatusResponse>(`business = "${bid}"`, common)
			)
		]);

		return {
			stats,
			todayBookings,
			newReviewsCount: newReviews?.totalItems ?? null,
			siteStatus
		};
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
