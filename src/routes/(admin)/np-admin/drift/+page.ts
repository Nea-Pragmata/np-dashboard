import { error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type SiteStatusResponse,
	type AgencyTasksResponse,
	type BusinessesResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** A site_status row with its business expanded (for the name column). */
export type SiteStatusRow = SiteStatusResponse<{ business: BusinessesResponse }>;

/** An agency task with its (optional) business expanded. */
export type TaskRow = AgencyTasksResponse<{ business?: BusinessesResponse }>;

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load the cross-business operations overview: per-business `site_status`
 * (uptime / SSL / backup / SEO) and the agency task list. Both collections are
 * read-only here and scoped server-side by the agency rules (a byråansatt sees
 * only its businesses, plus agency-wide tasks). Reads run in parallel via
 * SvelteKit's `fetch`; a dead server → error(503). Rows are sorted client-side
 * (by business name / task deadline) since neither can sort on the expanded
 * relation server-side.
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [siteStatus, tasks] = await Promise.all([
			pb.collection(Collections.SiteStatus).getFullList<SiteStatusRow>({
				expand: 'business',
				...common
			}),
			pb.collection(Collections.AgencyTasks).getFullList<TaskRow>({
				expand: 'business',
				...common
			})
		]);
		return { siteStatus, tasks };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
