import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** NP Admin has no dashboard of its own — land on «Bedrifter». */
export const load: PageLoad = () => {
	redirect(307, '/np-admin/bedrifter');
};
