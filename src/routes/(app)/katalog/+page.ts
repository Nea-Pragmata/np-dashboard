import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	AttributeSchemasShowInOptions,
	type ProductsResponse,
	type CategoriesResponse,
	type AttributeSchemasResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** A product with its category expanded and a typed `attributes` bag. */
export type CatalogProduct = ProductsResponse<
	Record<string, unknown>,
	{ category?: CategoriesResponse }
>;

/**
 * PocketBase surfaces an unreachable server as a ClientResponseError with a
 * falsy status (the request never received an HTTP response).
 */

/**
 * Load the Katalog for the active business:
 *   - all products (any status — the owner manages hidden/sold too), category expanded,
 *   - the business's categories (for the Kategorier tab + the product form's Select),
 *   - the business's attribute_schemas, sorted by sort_order, narrowed to the ones
 *     that belong in the catalog (`show_in` includes "catalog"). These drive the
 *     dynamic industry fields in the product drawer — no per-industry code.
 *
 * Reads run in parallel with `requestKey:null` (no auto-cancel) through
 * SvelteKit's `fetch`; a dead server → error(503) handled by +error.svelte.
 */
export const load: PageLoad = async ({ parent, fetch }) => {
	const { business } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);

	const bid = business.id;
	const common = { requestKey: null, fetch } as const;

	try {
		const [products, categories, schemas] = await Promise.all([
			pb.collection(Collections.Products).getFullList<CatalogProduct>({
				filter: `business = "${bid}"`,
				expand: 'category',
				sort: 'sort_order,name',
				...common
			}),
			pb.collection(Collections.Categories).getFullList<CategoriesResponse>({
				filter: `business = "${bid}"`,
				sort: 'sort_order,name',
				...common
			}),
			pb.collection(Collections.AttributeSchemas).getFullList<AttributeSchemasResponse>({
				filter: `business = "${bid}"`,
				sort: 'sort_order',
				...common
			})
		]);

		const catalogSchemas = schemas.filter((s) =>
			(s.show_in ?? []).includes(AttributeSchemasShowInOptions.catalog)
		);

		return { products, categories, schemas: catalogSchemas };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
