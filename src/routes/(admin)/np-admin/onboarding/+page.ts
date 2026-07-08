import { error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
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

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load the published packages + add-on services that back the onboarding picker.
 * Both collections are agency-readable published-only (the API rules already
 * enforce `published = true`). Reads run in parallel via SvelteKit's `fetch`; a
 * dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
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
