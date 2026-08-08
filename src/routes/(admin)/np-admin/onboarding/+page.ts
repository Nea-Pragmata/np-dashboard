import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type PackagesResponse,
	type AddonServicesResponse
} from '$lib/pocketbase-types';
import type { ModuleKey } from '$lib/utils/modules';
import type { PageLoad } from './$types';

/** A package whose `default_modules` is the JSON array of module keys. */
export type PackageRow = PackagesResponse<ModuleKey[], string[]>;
export type AddonRow = AddonServicesResponse;

/**
 * Load the published packages + add-on services that back the onboarding picker.
 * Agency members can read unpublished rows too (see the price book), so the
 * published-only filter is explicit here — you onboard onto what the website
 * actually sells. Reads run in parallel via SvelteKit's `fetch`; a dead server
 * → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, filter: 'published = true', fetch } as const;
	try {
		const [packages, addons] = await Promise.all([
			pb.collection(Collections.Packages).getFullList<PackageRow>({ sort: 'sort_order', ...common }),
			pb
				.collection(Collections.AddonServices)
				.getFullList<AddonRow>({ sort: 'sort_order', ...common })
		]);
		return { packages, addons };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
