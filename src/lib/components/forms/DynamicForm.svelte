<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import DynamicField from './DynamicField.svelte';
	import type { AttributeSchemasRecord } from '$lib/pocketbase-types';
	import { cn } from '$lib/utils.js';

	let {
		schemas,
		// The products.attributes json — keyed by each schema's `key`.
		values = $bindable({}),
		class: className
	}: {
		/** Already sorted by sort_order and filtered by show_in. */
		schemas: AttributeSchemasRecord[];
		values?: Record<string, unknown>;
		class?: string;
	} = $props();

	let errors = $state<Record<string, string>>({});

	function isEmpty(v: unknown): boolean {
		return v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));
	}

	/**
	 * Validate all required fields. Sets per-field bokmål messages and returns
	 * whether the form is submittable. Callers run this from the drawer footer's
	 * primary button before mutating PocketBase.
	 */
	export function validate(): boolean {
		const next: Record<string, string> = {};
		for (const schema of schemas) {
			// A bool always has a concrete value (on/off), so "required" is moot.
			if (!schema.required || schema.field_type === 'bool') continue;
			if (isEmpty(values[schema.key])) {
				next[schema.key] = `${schema.label} må fylles ut.`;
			}
		}
		errors = next;
		return Object.keys(next).length === 0;
	}

	/** Clear stored errors (e.g. when reopening the drawer for a new record). */
	export function reset(): void {
		errors = {};
	}

	function clearError(key: string): void {
		if (errors[key]) {
			const { [key]: _removed, ...rest } = errors;
			errors = rest;
		}
	}
</script>

<Field.Group class={cn(className)}>
	{#each schemas as schema (schema.id)}
		<DynamicField
			{schema}
			bind:value={values[schema.key]}
			error={errors[schema.key]}
			onedit={() => clearError(schema.key)}
		/>
	{/each}
</Field.Group>
