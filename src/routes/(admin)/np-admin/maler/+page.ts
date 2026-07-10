import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type ContentTemplatesResponse,
	type AttributeSchemasResponse,
	type BusinessesResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** A content template with its (optional) business relation expanded. */
export type TemplateRow = ContentTemplatesResponse<{ business?: BusinessesResponse }>;
/** An attribute schema with its owning business expanded (for the overview). */
export type SchemaRow = AttributeSchemasResponse<unknown, { business?: BusinessesResponse }>;
export type BusinessRow = BusinessesResponse;

/**
 * Load the agency template library: `content_templates` (global `business = ""`
 * plus per-business, grouped by type in the UI), the `attribute_schemas` used by
 * the catalog dynamic-fields feature (read-only overview here), and the list of
 * businesses that backs the scope picker. All are agency-scoped server-side.
 * Reads run in parallel via SvelteKit's `fetch`; a dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [templates, schemas, businesses] = await Promise.all([
			pb
				.collection(Collections.ContentTemplates)
				.getFullList<TemplateRow>({ expand: 'business', sort: 'type,name', ...common }),
			pb
				.collection(Collections.AttributeSchemas)
				.getFullList<SchemaRow>({ expand: 'business', sort: 'sort_order,label', ...common }),
			pb.collection(Collections.Businesses).getFullList<BusinessRow>({ sort: 'name', ...common })
		]);
		return { templates, schemas, businesses };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
