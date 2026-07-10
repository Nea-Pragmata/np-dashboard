import { error, redirect } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type AddonServicesResponse,
	type AgencyCampaignsResponse,
	type BusinessesResponse,
	type IntegrationStatusResponse,
	type PackagesResponse,
	type SubscriptionsResponse,
	type UsersResponse
} from '$lib/pocketbase-types';
import type { OpeningHours } from '../../booking/week';
import { DEFAULT_FANE, isFaneSlug } from '../fanes';
import type { PageLoad } from './$types';

/** Business with a typed `opening_hours` blob (same shape Booking edits). */
export type SettingsBusiness = BusinessesResponse<unknown, OpeningHours>;

/** Relations expanded on the tenant's subscription (Abonnement & moduler tab). */
export type SubscriptionExpand = {
	package: PackagesResponse<string[], string[]>;
	addons?: AddonServicesResponse[];
	campaign?: AgencyCampaignsResponse;
};
export type SettingsSubscription = SubscriptionsResponse<SubscriptionExpand>;

/** Resolve a 404 (no subscription row yet) to null; re-throw everything else. */
async function firstOrNull<T>(promise: Promise<T>): Promise<T | null> {
	try {
		return await promise;
	} catch (e) {
		if (e instanceof ClientResponseError && e.status === 404) return null;
		throw e;
	}
}

/**
 * Load data for the active Innstillinger tab.
 *
 *  - Innstillinger is always-on, so there is no module gate here.
 *  - An unknown `[fane]` slug redirects to the default tab (Bedriftsprofil).
 *  - The business is re-fetched fresh (not the cached layout copy) so the
 *    Bedriftsprofil form always edits current server values.
 *  - Team & brukere needs the tenant's users; the owner may list its own
 *    business' users (API rule), and staff may read the same list. It is a tiny
 *    result, so it is loaded for every tab to keep tab switches instant.
 *  - Integrasjoner + Abonnement reads are tab-scoped (only fetched on their own
 *    tab) so switching to Bedriftsprofil/Team never pays for those queries.
 *  - `depends('app:settings')` lets a mutation re-run just this load.
 */
export const load: PageLoad = async ({ params, parent, fetch, depends }) => {
	if (!isFaneSlug(params.fane)) redirect(307, `/innstillinger/${DEFAULT_FANE}`);

	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);

	depends('app:settings');

	const bid = business.id;
	const common = { requestKey: null, fetch } as const;

	try {
		const [fresh, users] = await Promise.all([
			pb.collection(Collections.Businesses).getOne<SettingsBusiness>(bid, common),
			pb.collection(Collections.Users).getFullList<UsersResponse>({
				filter: `business = "${bid}"`,
				// Owner(s) first, then staff alphabetically by name.
				sort: 'role,name',
				...common
			})
		]);

		let integrations: IntegrationStatusResponse[] = [];
		let subscription: SettingsSubscription | null = null;

		if (params.fane === 'integrasjoner') {
			// The integration_status VIEW exposes provider/status/updated only — never
			// config or secrets. Customers cannot read the `integrations` base
			// collection at all, so this view is the single honest source here.
			integrations = await pb
				.collection(Collections.IntegrationStatus)
				.getFullList<IntegrationStatusResponse>({
					filter: `business = "${bid}"`,
					sort: 'provider',
					...common
				});
		} else if (params.fane === 'abonnement') {
			// Read-only for the customer (business = own). Package/addons/campaign are
			// agency-controlled; the tab only displays them. A missing row → null.
			subscription = await firstOrNull(
				pb
					.collection(Collections.Subscriptions)
					.getFirstListItem<SettingsSubscription>(`business = "${bid}"`, {
						expand: 'package,addons,campaign',
						...common
					})
			);
		}

		return { fane: params.fane, business: fresh, users, modules, integrations, subscription };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
