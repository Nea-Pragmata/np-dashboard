import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/stores/auth.svelte';
import type { LayoutLoad } from './$types';

/** Already signed in? Skip the auth screens and go to the dashboard. */
export const load: LayoutLoad = async ({ parent }) => {
	await parent();
	if (auth.user) redirect(302, '/oversikt');
	return {};
};
