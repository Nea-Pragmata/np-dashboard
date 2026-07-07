import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/stores/auth.svelte';
import { tenant } from '$lib/stores/tenant.svelte';
import { pb } from '$lib/pb';
import { Collections, type BusinessesResponse } from '$lib/pocketbase-types';
import type { BusinessModules } from '$lib/utils/modules';
import type { LayoutLoad } from './$types';

/**
 * Gate the customer dashboard and resolve the active business + its enabled
 * modules. `depends('app:tenant')` lets the tenant switcher re-run this load
 * (via `invalidate('app:tenant')`) when an agency user changes business.
 *
 *  - Customer: always their own single business.
 *  - Agency: the persisted tenant if still allowed, else the first business the
 *    PocketBase rules return for them (empty allowed_businesses ⇒ all).
 */
export const load: LayoutLoad = async ({ parent, depends, fetch }) => {
	await parent();
	depends('app:tenant');

	if (!auth.user) redirect(302, '/logg-inn');

	let businesses: BusinessesResponse[] = [];
	let business: BusinessesResponse | null = null;

	if (auth.isAgency) {
		// Route the PocketBase request through the `fetch` SvelteKit passes to
		// `load` (instead of the SDK's default global fetch). Silences the dev
		// warning on client-side invalidate (tenant switch) and honours the
		// ledger's M2 note to not lean on the shared global client here.
		businesses = await pb
			.collection(Collections.Businesses)
			.getFullList({ sort: 'name', fetch });
		business = businesses.find((b) => b.id === tenant.id) ?? businesses[0] ?? null;
	} else {
		business = auth.business;
		businesses = business ? [business] : [];
	}

	const modules = (business?.modules ?? {}) as BusinessModules;

	return { business, businesses, modules };
};
