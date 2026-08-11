import posthog from 'posthog-js';
import { browser } from '$app/environment';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';
import { auth } from '$lib/stores/auth.svelte';
import { consent } from '$lib/stores/consent.svelte';
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
export const load: LayoutLoad = async ({ fetch }) => {
	// Analytics: client-only, cookie-free (localStorage). Guarded on the key so a
	// missing/placeholder env just no-ops instead of throwing. auth.init() below
	// identifies the user once the session resolves.
	if (browser && PUBLIC_POSTHOG_KEY && !PUBLIC_POSTHOG_KEY.endsWith('REPLACE_ME')) {
		posthog.init(PUBLIC_POSTHOG_KEY, {
			api_host: 'https://eu.i.posthog.com',
			// `defaults` pins PostHog's recommended config baseline as of this date
			// (a versioned defaults set — e.g. SPA history-change pageview capture).
			// Bump it deliberately against the changelog, not casually.
			// https://posthog.com/docs/libraries/js
			defaults: '2026-05-30',
			// Two-tier analytics consent (Norwegian ekomlov § 3-15 stores-on-device rule):
			//  - No choice yet / declined -> cookieless server-hash capture that writes
			//    NOTHING to the device (baseline usage measurement, legitimate interest).
			//  - Opted in -> full localStorage persistence + identify() (see consent store).
			// `opt_out_capturing_by_default` makes the pending state behave as declined, so
			// the baseline captures cookielessly on first load without storing anything;
			// `persistence` only takes effect after opt_in_capturing(). Requires "Cookieless
			// server hash mode" enabled in the PostHog project, else these events are dropped.
			cookieless_mode: 'on_reject',
			opt_out_capturing_by_default: true,
			persistence: 'localStorage',
			// Off: by default posthog-js autocaptures clicks/inputs with their DOM text,
			// which in this dashboard means customer names etc. — third-party PII that
			// must not leave the cookieless baseline (or reach PostHog at all). Only the
			// explicit, reviewed capture() events (ids only) are sent.
			autocapture: false
		});
		// Expose the instance for the `window.posthog.version` console check
		// (the ES-module import doesn't attach the global itself).
		Object.assign(window, { posthog });
		// Mirror the persisted consent choice into the store so the banner knows
		// whether to prompt (shows only while the status is 'pending').
		consent.sync();
	}
	// Pass the load `fetch` so the bootstrap PocketBase calls use SvelteKit's
	// instrumented fetch (avoids the dev-time "using window.fetch" warning).
	await auth.init(fetch);
	return {};
};
