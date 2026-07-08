import { error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type PackagesResponse,
	type AddonServicesResponse,
	type AgencyCampaignsResponse,
	type SubscriptionsResponse,
	type BusinessesResponse
} from '$lib/pocketbase-types';
import type { ModuleKey } from '$lib/utils/modules';
import type { PageLoad } from './$types';

/** A package whose `default_modules` is the JSON array of module keys. */
export type PackageRow = PackagesResponse<ModuleKey[], string[]>;
export type AddonRow = AddonServicesResponse;
export type CampaignRow = AgencyCampaignsResponse;
/** A subscription with its business (and, when published, its package) expanded. */
export type SubRow = SubscriptionsResponse<{
	business?: BusinessesResponse;
	package?: PackageRow;
}>;
export type BusinessRow = Pick<BusinessesResponse, 'id' | 'name'>;

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load the agency price book: packages, add-on services, campaigns (all
 * `published`-readable and returned published-only by the API), the
 * subscriptions across the agency's businesses (agency-scoped; drives the
 * per-package customer count + the Abonnementer table), and the business list
 * for the subscription editor. Reads run in parallel via SvelteKit's `fetch`; a
 * dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [packages, addons, campaigns, subscriptions, businesses] = await Promise.all([
			pb
				.collection(Collections.Packages)
				.getFullList<PackageRow>({ sort: 'sort_order', ...common }),
			pb
				.collection(Collections.AddonServices)
				.getFullList<AddonRow>({ sort: 'sort_order', ...common }),
			pb
				.collection(Collections.AgencyCampaigns)
				.getFullList<CampaignRow>({ sort: '-valid_from', ...common }),
			pb
				.collection(Collections.Subscriptions)
				.getFullList<SubRow>({ expand: 'business,package', sort: 'created', ...common }),
			pb
				.collection(Collections.Businesses)
				.getFullList<BusinessRow>({ fields: 'id,name', sort: 'name', ...common })
		]);
		return { packages, addons, campaigns, subscriptions, businesses };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
