import posthog from 'posthog-js';
import { auth } from '$lib/stores/auth.svelte';

/** PostHog's explicit consent states, plus `unavailable` when it isn't initialised. */
type ConsentStatus = 'granted' | 'denied' | 'pending' | 'unavailable';

/**
 * Reactive mirror of PostHog's analytics-consent state, and the only place that
 * flips it. PostHog itself is the source of truth — the choice lives in its
 * `__ph_opt_in_out_<token>` localStorage key — so this store keeps no key of its
 * own; it just exposes the status as a rune and wraps the opt-in/opt-out calls.
 *
 * Two tiers (configured in {@link import('../../routes/+layout').load}):
 *  - pending / denied -> cookieless baseline: server-hash capture that writes
 *    NOTHING to the device (usage measurement on legitimate interest).
 *  - granted          -> full localStorage analytics + identify() with email/name.
 */
class ConsentStore {
	/** `unavailable` while PostHog isn't initialised (e.g. no key configured). */
	status = $state<ConsentStatus>('unavailable');

	/** Read the persisted choice from PostHog. Call once after posthog.init(). */
	sync(): void {
		if (typeof window === 'undefined' || !('posthog' in window)) {
			this.status = 'unavailable';
			return;
		}
		this.status = posthog.get_explicit_consent_status();
	}

	/** Opt in to enhanced analytics: localStorage identity + identify the user. */
	accept(): void {
		posthog.opt_in_capturing();
		// Identify the current user right away; #syncOnce only re-identifies on the
		// next auth change, so a mid-session opt-in would otherwise miss them.
		const u = auth.user;
		if (u) posthog.identify(u.id, { email: u.email, name: u.name });
		this.status = 'granted';
	}

	/** Decline the enhanced tier: keep the cookieless baseline, record the refusal. */
	decline(): void {
		posthog.opt_out_capturing();
		this.status = 'denied';
	}

	/** Re-open the choice (e.g. from the privacy page): clears the recorded decision. */
	reopen(): void {
		if (typeof window === 'undefined' || !('posthog' in window)) return;
		posthog.clear_opt_in_out_capturing();
		this.status = 'pending';
	}
}

export const consent = new ConsentStore();
