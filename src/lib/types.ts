/**
 * Shared app-level types (not generated from PocketBase). Keep PB record shapes
 * in `$lib/pocketbase-types`; this file is for view-model / UI contracts reused
 * across pages and shared components.
 */

/** Load lifecycle of a table's data — drives DataTable's render branch. */
export type TableStatus = 'ready' | 'loading' | 'error';

/**
 * Generic table data envelope consumed by {@link DataTable}. Callers map their
 * PocketBase load result into this shape:
 *   - `loading`  → skeleton rows
 *   - `error`    → Alert + «Prøv igjen»
 *   - `ready`    → rows (or EmptyState when `items` is empty)
 */
export type TableState<T> = {
	status: TableStatus;
	items: T[];
	/** Human, Norwegian message shown in the error state. */
	error?: string;
};
