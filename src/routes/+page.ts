import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/stores/auth.svelte';
import type { PageLoad } from './$types';

/** Bounce the bare root to the dashboard (or the login page when signed out). */
export const load: PageLoad = async ({ parent }) => {
	await parent();
	redirect(302, auth.user ? '/oversikt' : '/logg-inn');
};
