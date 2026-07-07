import { error, redirect } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type ReviewsResponse,
	type IntegrationStatusResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

/**
 * PocketBase surfaces an unreachable server as a ClientResponseError with a
 * falsy status (the request never received an HTTP response).
 */
function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load Google/Facebook reviews for the active business, newest post first, plus
 * the Google/Facebook connection status for the «Tilkoblinger» card.
 *
 * Reviews are synced FROM the platforms (create/delete are locked server-side);
 * this page only reads them and lets the owner write a reply. Reads run through
 * SvelteKit's `fetch` with `requestKey:null` (no auto-cancel); a dead server →
 * error(503) → the designed +error.svelte state.
 *
 * `depends('app:reviews')` lets the realtime effect + the reply mutation re-run
 * just this load via `invalidate('app:reviews')`.
 */
export const load: PageLoad = async ({ parent, depends, fetch }) => {
	depends('app:reviews');

	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);
	// «Anmeldelser» is a module-gated page — hide it from pure-website tenants.
	if (!modules.reviews) redirect(302, '/oversikt');

	try {
		const [reviews, integrations] = await Promise.all([
			pb.collection(Collections.Reviews).getFullList<ReviewsResponse>({
				filter: `business = "${business.id}"`,
				sort: '-posted_at',
				requestKey: null,
				fetch
			}),
			// google + meta (Facebook) connection rows for the «Tilkoblinger» card.
			pb.collection(Collections.IntegrationStatus).getFullList<IntegrationStatusResponse>({
				filter: `business = "${business.id}" && (provider = "google" || provider = "meta")`,
				requestKey: null,
				fetch
			})
		]);

		return { reviews, integrations };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
