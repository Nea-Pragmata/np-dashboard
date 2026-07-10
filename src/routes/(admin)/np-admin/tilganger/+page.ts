import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type AgencyMembersResponse,
	type BusinessesResponse,
	type UsersResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** An agency membership with its user account expanded (name / e-post / sist aktiv). */
export type MemberRow = AgencyMembersResponse<{ user?: UsersResponse }>;
/** Minimal business shape for the scope multi-select + id→name map. */
export type BusinessRow = Pick<BusinessesResponse, 'id' | 'name'>;

/**
 * Load the agency access list: every `agency_members` row (with its user
 * expanded) and the business list that backs the scope editor. Any active agency
 * member may READ the members list (BM rule); only a byråeier may write (BE) —
 * the page hides the write controls for non-owners. Reads run in parallel via
 * SvelteKit's `fetch`; a dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [members, businesses] = await Promise.all([
			pb
				.collection(Collections.AgencyMembers)
				.getFullList<MemberRow>({ expand: 'user', sort: 'created', ...common }),
			pb
				.collection(Collections.Businesses)
				.getFullList<BusinessRow>({ fields: 'id,name', sort: 'name', ...common })
		]);
		return { members, businesses };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
