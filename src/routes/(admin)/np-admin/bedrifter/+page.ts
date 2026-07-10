import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type AdminBusinessOverviewResponse,
	type BusinessesResponse
} from '$lib/pocketbase-types';
import type { BusinessModules } from '$lib/utils/modules';
import type { PageLoad } from './$types';

/** One row of the agency overview view (module_count is a SQLite COUNT number). */
export type OverviewRow = AdminBusinessOverviewResponse<number>;

/** Full business record — the drawer needs `modules` (+ profile fields). */
export type BusinessRow = BusinessesResponse<BusinessModules>;

/**
 * Load every business the signed-in agency member may see. `admin_business_overview`
 * drives the table (name/type/status/package/module_count/last_active); the full
 * `businesses` records back the detail drawer's modules editor. Both are scoped
 * server-side by the agency rules — a byråansatt automatically sees only its
 * allowed businesses. Reads run in parallel (`requestKey:null`) via SvelteKit's
 * `fetch`; a dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [overview, businesses] = await Promise.all([
			pb
				.collection(Collections.AdminBusinessOverview)
				.getFullList<OverviewRow>({ sort: 'name', ...common }),
			pb.collection(Collections.Businesses).getFullList<BusinessRow>({ sort: 'name', ...common })
		]);
		return { overview, businesses };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
