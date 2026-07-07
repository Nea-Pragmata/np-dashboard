import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/stores/auth.svelte';
import type { LayoutLoad } from './$types';

/**
 * NP Admin (byrå superadmin) area. Only active agency members may enter; a
 * signed-out user goes to login, a customer to their own dashboard. The full
 * dark-sidebar admin shell arrives in milestone 13.
 */
export const load: LayoutLoad = async ({ parent }) => {
	await parent();
	if (!auth.user) redirect(302, '/logg-inn');
	if (!auth.isAgency) redirect(302, '/oversikt');
	return {};
};
