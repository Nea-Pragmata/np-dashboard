import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import { tenant } from '$lib/stores/tenant.svelte';
import {
	Collections,
	AgencyMembersStatusOptions,
	type UsersResponse,
	type BusinessesResponse,
	type AgencyMembersResponse
} from '$lib/pocketbase-types';

/** Current user with its `business` relation expanded (when set). */
type ExpandedUser = UsersResponse<{ business?: BusinessesResponse }>;

/**
 * Reactive auth state singleton.
 *
 * Holds plain snapshots of the PocketBase records in `$state`. The live `pb`
 * instance is never stored in runes (that breaks authStore/SSE); instead we
 * copy record fields into state and re-sync whenever the auth token changes.
 */
class AuthStore {
	user = $state<UsersResponse | null>(null);
	business = $state<BusinessesResponse | null>(null);
	agencyMember = $state<AgencyMembersResponse | null>(null);

	/** In-flight sync, shared so concurrent callers coalesce (see {@link #sync}). */
	#syncInFlight: Promise<void> | null = null;

	/** True when the signed-in user is an active agency member (NP Admin). */
	readonly isAgency = $derived(
		this.agencyMember?.status === AgencyMembersStatusOptions.active
	);

	/**
	 * Business ids this agency member may access. An EMPTY array means "all
	 * businesses" (agency-owner convention — matches the API rules).
	 */
	readonly allowedBusinesses = $derived<string[]>(
		this.agencyMember?.allowed_businesses ?? []
	);

	constructor() {
		// Re-sync on any auth change: login, logout, refresh, or cross-tab edits.
		pb.authStore.onChange(() => {
			void this.#sync();
		});
	}

	/**
	 * Bootstrap auth from the persisted token. Call once from the root layout.
	 * Refreshes the session, then loads the business + agency membership.
	 */
	async init(): Promise<void> {
		if (!pb.authStore.isValid) {
			this.#reset();
			return;
		}
		try {
			await pb.collection(Collections.Users).authRefresh({ expand: 'business' });
		} catch (e) {
			if (e instanceof ClientResponseError && e.isAbort) return;
			// Token is invalid/expired — drop it and fall back to logged-out.
			pb.authStore.clear();
			this.#reset();
			return;
		}
		await this.#sync();
	}

	async login(email: string, password: string): Promise<void> {
		await pb
			.collection(Collections.Users)
			.authWithPassword(email, password, { expand: 'business' });
		// onChange already kicked off a sync; await one to guarantee state is
		// populated before the caller (e.g. a redirect) runs.
		await this.#sync();
	}

	logout(): void {
		pb.authStore.clear();
		tenant.clear();
		this.#reset();
	}

	/**
	 * Rebuild all state from the current authStore record.
	 *
	 * Coalesces concurrent calls: `authStore.onChange` fires a sync at the same
	 * moment `login()`/`init()` awaits one for the *same* auth change. Running
	 * both races two identical PocketBase reads and the SDK auto-cancels the
	 * loser (surfacing as `net::ERR_ABORTED`). Sharing one in-flight promise
	 * keeps it to a single request per auth change.
	 */
	#sync(): Promise<void> {
		this.#syncInFlight ??= this.#syncOnce().finally(() => {
			this.#syncInFlight = null;
		});
		return this.#syncInFlight;
	}

	async #syncOnce(): Promise<void> {
		const record = pb.authStore.record as ExpandedUser | null;
		if (!record) {
			this.#reset();
			return;
		}
		// Snapshot into state — never keep a reference to the live model.
		this.user = { ...record };
		await Promise.all([this.#loadBusiness(record), this.#loadAgencyMember(record)]);
	}

	async #loadBusiness(record: ExpandedUser): Promise<void> {
		if (!record.business) {
			this.business = null;
			return;
		}
		// Prefer the expanded relation from auth; fall back to a direct fetch.
		const expanded = record.expand?.business;
		if (expanded) {
			this.business = { ...expanded };
			return;
		}
		try {
			const biz = await pb.collection(Collections.Businesses).getOne(record.business);
			this.business = { ...biz };
		} catch (e) {
			if (e instanceof ClientResponseError && e.isAbort) return;
			this.business = null;
		}
	}

	async #loadAgencyMember(record: UsersResponse): Promise<void> {
		try {
			const member = await pb
				.collection(Collections.AgencyMembers)
				.getFirstListItem(`user = "${record.id}"`);
			this.agencyMember = { ...member };
		} catch (e) {
			if (e instanceof ClientResponseError) {
				if (e.isAbort) return;
				// 404 = no membership row → this user is a customer, not agency.
				if (e.status === 404) {
					this.agencyMember = null;
					return;
				}
			}
			this.agencyMember = null;
		}
	}

	#reset(): void {
		this.user = null;
		this.business = null;
		this.agencyMember = null;
	}
}

export const auth = new AuthStore();
