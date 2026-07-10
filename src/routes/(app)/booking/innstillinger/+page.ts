import { error, redirect } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type BusinessesResponse,
	type BookingSettingsResponse,
	type ResourcesResponse,
	type UsersResponse
} from '$lib/pocketbase-types';
import type { OpeningHours } from '../week';
import type { PageLoad } from './$types';

/** `booking_settings.reminders` shape (per fasit v2). */
export type Reminders = {
	sms?: boolean;
	email?: boolean;
	hours_before?: number;
	follow_up?: boolean;
};
/** `booking_settings.deposit` shape — deposit config lives ONLY here (v2.3). */
export type Deposit = {
	enabled?: boolean;
	percent?: number;
	method?: string;
	min_amount?: number;
};
/** `booking_settings.waitlist` shape. */
export type WaitlistConfig = {
	enabled?: boolean;
	cancellation_deadline_hours?: number;
};

export type SettingsRow = BookingSettingsResponse<Deposit, Reminders, WaitlistConfig>;
export type ResourceRow = ResourcesResponse<{ staff?: UsersResponse }>;

/**
 * Load the booking-settings view for the active business:
 *
 *  - Booking is module-gated: a tenant without `modules.booking` is redirected
 *    to /oversikt (the menu never links here, but a deep link is guarded too).
 *  - Opening hours live on `businesses.opening_hours` (the ONLY source, v2.2), so
 *    the business is re-fetched fresh for editing rather than reusing the cached
 *    copy from the (app) layout.
 *  - `booking_settings` is one row per business; it may be missing for a
 *    customer-owned tenant (its Create rule is agency-only), in which case the
 *    reminder/deposit/waitlist cards render read-only with a notice. The seeded
 *    demo (Frisør Oslo) always has a row.
 *  - `depends('app:booking-settings')` lets a save re-run just this load.
 *  - Reads run in parallel with `requestKey:null` through SvelteKit's `fetch`; a
 *    dead server → error(503) rendered by +error.svelte.
 */
export const load: PageLoad = async ({ parent, fetch, depends }) => {
	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);
	if (!modules.booking) redirect(302, '/oversikt');

	depends('app:booking-settings');

	const bid = business.id;
	const common = { requestKey: null, fetch } as const;

	try {
		const [fresh, settingsList, resources, staff] = await Promise.all([
			pb
				.collection(Collections.Businesses)
				.getOne<BusinessesResponse<unknown, OpeningHours>>(bid, common),
			pb
				.collection(Collections.BookingSettings)
				.getFullList<SettingsRow>({ filter: `business = "${bid}"`, ...common }),
			pb.collection(Collections.Resources).getFullList<ResourceRow>({
				filter: `business = "${bid}"`,
				sort: 'name',
				expand: 'staff',
				...common
			}),
			pb.collection(Collections.Users).getFullList<UsersResponse>({
				filter: `business = "${bid}"`,
				sort: 'name',
				...common
			})
		]);

		return {
			openingHours: (fresh.opening_hours ?? {}) as OpeningHours,
			settings: settingsList[0] ?? null,
			resources,
			staff
		};
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
