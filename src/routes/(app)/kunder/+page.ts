import { error, redirect } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import { Collections, type CustomersResponse } from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** Shape of `customers.punch_card` — the loyalty («klippekort») JSON. */
export type PunchCard = {
	count: number;
	goal: number;
	reward_text?: string;
};

/**
 * Shape of `customers.consents` — GDPR marketing consents. `registered` is the
 * ISO date the FIRST consent was granted; absent until something is granted.
 */
export type Consents = {
	email?: boolean;
	sms?: boolean;
	registered?: string;
};

/** A customer with its typed loyalty + consent JSON bags. */
export type CustomerRow = CustomersResponse<Consents, PunchCard>;

/**
 * PocketBase surfaces an unreachable server as a ClientResponseError with a
 * falsy status (the request never received an HTTP response).
 */

/**
 * Load the customer register for the active business, newest visit first (the
 * Figma default «Sortert på: Sist besøk»); search/consent/sort refinement is
 * client-side over this list.
 *
 * Kunder is module-gated on `businesses.modules.customers` — a tenant without it
 * is redirected to /oversikt (defensive; the sidebar already hides the entry).
 *
 * Reads run through SvelteKit's `fetch` with `requestKey:null` (no auto-cancel);
 * a dead server → error(503), which renders the designed +error.svelte state.
 * `depends('app:customers')` lets mutations re-run this load via invalidation.
 */
export const load: PageLoad = async ({ parent, depends, fetch }) => {
	depends('app:customers');

	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);
	if (!modules?.customers) redirect(302, '/oversikt');

	try {
		const customers = await pb.collection(Collections.Customers).getFullList<CustomerRow>({
			filter: `business = "${business.id}"`,
			sort: '-last_visit,name',
			requestKey: null,
			fetch
		});

		return { customers };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
