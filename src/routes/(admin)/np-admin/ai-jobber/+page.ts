import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type AiJobsResponse,
	type AiJobRunsResponse,
	type BusinessesResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** Notification flags stored on `ai_jobs.notifications`. */
export interface JobNotifications {
	email_on_findings?: boolean;
	show_status_to_client?: boolean;
	create_task?: boolean;
}

/** An AI job with its target businesses expanded. */
export type JobRow = AiJobsResponse<JobNotifications, { businesses?: BusinessesResponse[] }>;
/** An immutable job run (read-only history). */
export type RunRow = AiJobRunsResponse;
export type BusinessRow = BusinessesResponse;

/**
 * Load the agency AI-jobs board: the `ai_jobs` configs (with their target
 * businesses expanded), the `ai_job_runs` history (read-only, newest first), and
 * the business list (drives the multi-select + «Alle bedrifter» detection). All
 * are agency-scoped server-side. Reads run in parallel via SvelteKit's `fetch`;
 * a dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [jobs, runs, businesses] = await Promise.all([
			pb
				.collection(Collections.AiJobs)
				.getFullList<JobRow>({ expand: 'businesses', sort: 'type', ...common }),
			pb.collection(Collections.AiJobRuns).getFullList<RunRow>({ sort: '-ran_at', ...common }),
			pb.collection(Collections.Businesses).getFullList<BusinessRow>({ sort: 'name', ...common })
		]);
		return { jobs, runs, businesses };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
