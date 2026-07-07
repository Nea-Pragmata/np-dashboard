import { error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type InquiriesResponse,
	type CustomersResponse,
	type ProductsResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

/** An inquiry with its customer + product relations expanded. */
export type InquiryRow = InquiriesResponse<{
	customer?: CustomersResponse;
	product?: ProductsResponse;
}>;

/**
 * PocketBase surfaces an unreachable server as a ClientResponseError with a
 * falsy status (the request never received an HTTP response).
 */
function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load the unified inbox for the active business: every inquiry (any status —
 * the owner triages new/in-progress/done here), newest first, with the customer
 * and product relations expanded for the detail view.
 *
 * Reads run through SvelteKit's `fetch` with `requestKey:null` (no auto-cancel);
 * a dead server → error(503), which renders the designed +error.svelte state.
 *
 * `depends('app:inquiries')` lets the realtime effect + mutations re-run just
 * this load via `invalidate('app:inquiries')` (mutations use `invalidateAll()`
 * so the app-shell «Henvendelser» badge re-counts too).
 */
export const load: PageLoad = async ({ parent, depends, fetch }) => {
	depends('app:inquiries');

	const { business } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);

	try {
		const inquiries = await pb.collection(Collections.Inquiries).getFullList<InquiryRow>({
			filter: `business = "${business.id}"`,
			expand: 'customer,product',
			sort: '-created',
			requestKey: null,
			fetch
		});

		return { inquiries };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
