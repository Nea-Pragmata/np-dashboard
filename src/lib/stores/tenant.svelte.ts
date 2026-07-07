const STORAGE_KEY = 'np:tenant';

/**
 * Active business id for agency users (byråbrukere) who can act on behalf of
 * multiple tenants. Customers always have a single fixed business, so this is
 * only meaningful when {@link import('./auth.svelte').auth.isAgency} is true.
 *
 * Persisted to localStorage so the chosen tenant survives reloads.
 */
class TenantStore {
	#id = $state<string | null>(null);

	constructor() {
		if (typeof localStorage !== 'undefined') {
			this.#id = localStorage.getItem(STORAGE_KEY);
		}
	}

	get id(): string | null {
		return this.#id;
	}

	/** Select the active business (or pass null to clear the selection). */
	set(id: string | null): void {
		this.#id = id;
		if (typeof localStorage === 'undefined') return;
		if (id) localStorage.setItem(STORAGE_KEY, id);
		else localStorage.removeItem(STORAGE_KEY);
	}

	clear(): void {
		this.set(null);
	}
}

export const tenant = new TenantStore();
