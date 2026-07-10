import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type PagesResponse,
	type SiteStatusResponse,
	type IntegrationStatusResponse,
	type AiJobRunsResponse,
	type AiJobsResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** Shape of the automated-run `findings` JSON the customer is allowed to see. */
type JobRunFindings = { summary?: string; drafts?: number; suggestions?: string[] };

/** A client-visible automated run with its `ai_jobs` parent (type/interval) expanded. */
export type ClientJobRun = AiJobRunsResponse<JobRunFindings, { job?: AiJobsResponse }>;

/**
 * PocketBase surfaces an unreachable server as a ClientResponseError with a
 * falsy status (the request never received an HTTP response).
 */

/**
 * Load the always-on «Nettsted & SEO» surface for the active business:
 *   - pages: every page (published + draft), oldest first so «Forside» leads.
 *   - siteStatus: the single site_status row (uptime/ssl/backup/seo-review). It
 *     may be missing (404) for a freshly onboarded tenant → treated as null.
 *   - integrations: the integration_status *view* rows (connection health only —
 *     the integrations config itself is never exposed to the client).
 *   - jobRuns: automated ai_job_runs the tenant may see (show_status_to_client),
 *     newest first, for the SEO-review status line. Runs the customer is not
 *     permitted to see (e.g. security scans) are filtered out at the source.
 *
 * Reads run through SvelteKit's `fetch` with `requestKey:null` (no auto-cancel);
 * a dead server → error(503), which renders the designed +error.svelte state.
 */
export const load: PageLoad = async ({ parent, depends, fetch }) => {
	depends('app:nettsted');

	const { business } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);

	try {
		const pages = await pb.collection(Collections.Pages).getFullList<PagesResponse>({
			filter: `business = "${business.id}"`,
			sort: 'created',
			requestKey: null,
			fetch
		});

		// At most one site_status row per business; a missing row is a normal
		// (not-yet-provisioned) state, so swallow only the 404 here.
		let siteStatus: SiteStatusResponse | null = null;
		try {
			siteStatus = await pb
				.collection(Collections.SiteStatus)
				.getFirstListItem<SiteStatusResponse>(`business = "${business.id}"`, {
					requestKey: null,
					fetch
				});
		} catch (e) {
			if (e instanceof ClientResponseError && e.status === 404) siteStatus = null;
			else throw e;
		}

		const integrations = await pb
			.collection(Collections.IntegrationStatus)
			.getFullList<IntegrationStatusResponse>({
				filter: `business = "${business.id}"`,
				requestKey: null,
				fetch
			});

		const jobRuns = await pb.collection(Collections.AiJobRuns).getFullList<ClientJobRun>({
			filter: `business = "${business.id}" && show_status_to_client = true`,
			sort: '-ran_at',
			expand: 'job',
			requestKey: null,
			fetch
		});

		return { pages, siteStatus, integrations, jobRuns };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
