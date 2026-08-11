import { error, redirect } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	BusinessesStatusOptions,
	type PackagesResponse,
	type AddonServicesResponse
} from '$lib/pocketbase-types';
import type { ModuleKey } from '$lib/utils/modules';
import type { PageLoad } from './$types';
import type { BusinessRow } from '../bedrifter/+page';

const NOT_FOUND_MESSAGE = 'Fant ikke bedriften';

/** A package whose `default_modules` is the JSON array of module keys. */
export type PackageRow = PackagesResponse<ModuleKey[], string[]>;
export type AddonRow = AddonServicesResponse;

/**
 * Load the published packages + add-on services that back the onboarding picker.
 * Agency members can read unpublished rows too (see the price book), so the
 * published-only filter is explicit here — you onboard onto what the website
 * actually sells.
 *
 * `?bedrift=<id>` resumes a saved draft: the same screen comes back prefilled so
 * the agency reviews every field before activating. Only a draft may be resumed —
 * a live business is edited from the Bedrifter drawer instead.
 *
 * Reads run in parallel via SvelteKit's `fetch`; a missing id → 404, a dead
 * server → 503. Both render +error.svelte.
 */
export const load: PageLoad = async ({ fetch, url }) => {
	const common = { requestKey: null, fetch } as const;
	const priceBook = { ...common, filter: 'published = true' } as const;
	const draftId = url.searchParams.get('bedrift');

	let packages: PackageRow[];
	let addons: AddonRow[];
	let business: BusinessRow | null;
	try {
		[packages, addons, business] = await Promise.all([
			pb
				.collection(Collections.Packages)
				.getFullList<PackageRow>({ sort: 'sort_order', ...priceBook }),
			pb
				.collection(Collections.AddonServices)
				.getFullList<AddonRow>({ sort: 'sort_order', ...priceBook }),
			draftId ? pb.collection(Collections.Businesses).getOne<BusinessRow>(draftId, common) : null
		]);
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		// A bad id, or one outside this member's scope — PocketBase's view rule
		// answers 404 either way.
		if (e instanceof ClientResponseError && e.status === 404) error(404, NOT_FOUND_MESSAGE);
		throw e;
	}

	// Already live: nothing left to onboard, so send them to the business list.
	if (business && business.status !== BusinessesStatusOptions.onboarding) {
		redirect(302, '/np-admin/bedrifter');
	}

	return { packages, addons, business };
};
