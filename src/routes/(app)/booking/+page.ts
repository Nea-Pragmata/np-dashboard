import { error, redirect } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type BookingsResponse,
	type ProductsResponse,
	type UsersResponse,
	type CustomersResponse,
	type ResourcesResponse
} from '$lib/pocketbase-types';
import { weekStart, addDays, isoDate, parseIsoDate } from './week';
import type { PageLoad } from './$types';

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

/** A booking with product/staff/customer/resource expanded. */
export type WeekBooking = BookingsResponse<{
	product?: ProductsResponse;
	staff?: UsersResponse;
	customer?: CustomersResponse;
	resource?: ResourcesResponse;
}>;

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load one week of bookings for the active business, plus the reference lists the
 * drawer needs (bookable products, staff, resources, customers).
 *
 *  - Booking is module-gated: a tenant without `modules.booking` is redirected to
 *    /oversikt (the menu never links here, but a deep link is guarded too).
 *  - The visible week comes from `?uke=YYYY-MM-DD` (any date in the week; it is
 *    normalised to its Monday), defaulting to the week containing today. Changing
 *    the param re-runs this load, so week navigation is a plain `goto`.
 *  - `depends('app:bookings')` lets the realtime subscription re-run just this
 *    load (via `invalidate('app:bookings')`) on create/update/delete.
 *  - Reads run in parallel with `requestKey:null` through SvelteKit's `fetch`; a
 *    dead server → error(503) rendered by +error.svelte.
 */
export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);
	if (!modules.booking) redirect(302, '/oversikt');

	depends('app:bookings');

	const bid = business.id;
	const monday = weekStart(parseIsoDate(url.searchParams.get('uke')) ?? new Date());
	const nextMonday = addDays(monday, 7);
	const weekStartIso = isoDate(monday);

	// Half-open [monday, nextMonday) window on `start`, in UTC wall-clock.
	const weekFilter =
		`business = "${bid}"` +
		` && start >= "${isoDate(monday)} 00:00:00.000Z"` +
		` && start < "${isoDate(nextMonday)} 00:00:00.000Z"`;

	const common = { requestKey: null, fetch } as const;

	try {
		const [bookings, resources, products, staff, customers] = await Promise.all([
			pb.collection(Collections.Bookings).getFullList<WeekBooking>({
				filter: weekFilter,
				expand: 'product,staff,customer,resource',
				sort: 'start',
				...common
			}),
			pb.collection(Collections.Resources).getFullList<ResourcesResponse>({
				filter: `business = "${bid}" && active = true`,
				sort: 'name',
				...common
			}),
			pb.collection(Collections.Products).getFullList<ProductsResponse>({
				filter: `business = "${bid}" && bookable = true`,
				sort: 'name',
				...common
			}),
			pb.collection(Collections.Users).getFullList<UsersResponse>({
				filter: `business = "${bid}"`,
				sort: 'name',
				...common
			}),
			pb.collection(Collections.Customers).getFullList<CustomersResponse>({
				filter: `business = "${bid}"`,
				sort: 'name',
				...common
			})
		]);

		return { bookings, resources, products, staff, customers, weekStartIso };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
