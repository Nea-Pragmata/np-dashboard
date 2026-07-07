import { auth } from '$lib/stores/auth.svelte';
import type { LayoutLoad } from './$types';

// This is a fully client-rendered SPA: PocketBase auth lives in the browser
// (localStorage) and every load runs client-side against the shared `pb`
// client. No server rendering — so no per-request server auth to leak.
export const ssr = false;

/**
 * Bootstrap auth once, before any route guard runs. Child layouts `await
 * parent()` so their `auth.*` checks see the resolved session. Returns nothing
 * sensitive — auth state is read from the `auth` singleton, not from `data`.
 */
export const load: LayoutLoad = async () => {
	await auth.init();
	return {};
};
