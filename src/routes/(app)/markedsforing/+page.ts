import { redirect } from '@sveltejs/kit';
import { availableTabs } from './marketing';
import type { PageLoad } from './$types';

/**
 * `/markedsforing` has no view of its own — bounce to the first tab the tenant
 * can see (Kampanjer for a fully-enabled tenant, else the first enabled one).
 * Falls back to `kampanjer` so the [fane] loader can run its own module gate.
 */
export const load: PageLoad = async ({ parent }) => {
	const { modules } = await parent();
	const tabs = availableTabs(modules);
	redirect(307, `/markedsforing/${tabs[0]?.fane ?? 'kampanjer'}`);
};
