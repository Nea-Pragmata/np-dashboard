import { redirect } from '@sveltejs/kit';
import { DEFAULT_FANE } from './fanes';
import type { PageLoad } from './$types';

/** Bare `/innstillinger` opens the first tab (Bedriftsprofil). */
export const load: PageLoad = () => {
	redirect(307, `/innstillinger/${DEFAULT_FANE}`);
};
