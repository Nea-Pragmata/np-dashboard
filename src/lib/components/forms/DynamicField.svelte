<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import {
		parseDate,
		getLocalTimeZone,
		type DateValue
	} from '@internationalized/date';
	import { formatDate } from '$lib/utils/format';
	import type { AttributeSchemasRecord } from '$lib/pocketbase-types';
	import { cn } from '$lib/utils.js';

	type Option = { value: string; label: string };

	let {
		schema,
		// Genuinely polymorphic (text/number/select/bool/date) — `any` lets each
		// primitive bind:value without per-type casts.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value = $bindable(),
		error,
		onedit
	}: {
		schema: AttributeSchemasRecord;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value?: any;
		error?: string;
		/** Called on any user edit, so the form can clear a stale error. */
		onedit?: () => void;
	} = $props();

	const fieldId = $derived(`df-${schema.key}`);
	const invalid = $derived(Boolean(error));

	/** Accepts `["Dame","Herre"]` or `[{value,label}]` (or `{options:[…]}`). */
	function normalizeOptions(raw: unknown): Option[] {
		const list = Array.isArray(raw)
			? raw
			: raw && typeof raw === 'object' && Array.isArray((raw as { options?: unknown[] }).options)
				? (raw as { options: unknown[] }).options
				: [];
		return list.map((o) => {
			if (o && typeof o === 'object') {
				const rec = o as { value?: unknown; label?: unknown };
				const v = String(rec.value ?? rec.label ?? '');
				return { value: v, label: String(rec.label ?? rec.value ?? v) };
			}
			return { value: String(o), label: String(o) };
		});
	}

	const options = $derived(normalizeOptions(schema.options));
	const selectedLabel = $derived(
		options.find((o) => o.value === value)?.label ?? (value ? String(value) : undefined)
	);

	// --- date bridge: values store ISO "YYYY-MM-DD"; Calendar wants a DateValue.
	function toDateValue(v: unknown): DateValue | undefined {
		if (typeof v === 'string' && v) {
			try {
				return parseDate(v);
			} catch {
				return undefined;
			}
		}
		return undefined;
	}

	let dateValue = $state<DateValue | undefined>(toDateValue(value));
	let dateOpen = $state(false);

	// Re-sync when the parent swaps `value` externally (e.g. editing another row).
	// Guarded by string compare so it never fights the calendar's own writes.
	$effect(() => {
		const next = toDateValue(value);
		if ((next?.toString() ?? '') !== (dateValue?.toString() ?? '')) {
			dateValue = next;
		}
	});

	const dateLabel = $derived(
		dateValue ? formatDate(dateValue.toDate(getLocalTimeZone())) : 'Velg dato'
	);

	// Shared field-control look, mirrored for the date trigger (not a real input).
	const controlBase =
		'flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';
</script>

{#if schema.field_type === 'bool'}
	<Field.Field orientation="horizontal" data-invalid={invalid ? 'true' : undefined}>
		<Switch
			id={fieldId}
			checked={Boolean(value)}
			onCheckedChange={(checked) => {
				value = checked;
				onedit?.();
			}}
		/>
		<Field.Label for={fieldId} class="font-normal text-text-body">{schema.label}</Field.Label>
	</Field.Field>
{:else}
	<Field.Field data-invalid={invalid ? 'true' : undefined}>
		<Field.Label for={fieldId}>
			{schema.label}{#if schema.required}<span class="text-destructive"> *</span>{/if}
		</Field.Label>

		{#if schema.field_type === 'select'}
			<Select.Root
				type="single"
				bind:value
				onValueChange={() => onedit?.()}
			>
				<Select.Trigger id={fieldId} class="w-full" aria-invalid={invalid}>
					<span class={cn(!selectedLabel && 'text-muted-foreground')}>
						{selectedLabel ?? 'Velg …'}
					</span>
				</Select.Trigger>
				<Select.Content>
					{#each options as opt (opt.value)}
						<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{:else if schema.field_type === 'date'}
			<Popover.Root bind:open={dateOpen}>
				<Popover.Trigger
					id={fieldId}
					aria-invalid={invalid}
					class={cn(
						controlBase,
						!dateValue && 'text-muted-foreground',
						invalid && 'border-destructive ring-3 ring-destructive/20'
					)}
				>
					<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
					{dateLabel}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0" align="start">
					<Calendar
						type="single"
						bind:value={dateValue}
						locale="nb-NO"
						onValueChange={(v) => {
							value = v ? v.toString() : '';
							onedit?.();
							if (v) dateOpen = false;
						}}
					/>
				</Popover.Content>
			</Popover.Root>
		{:else if schema.field_type === 'number'}
			<Input
				id={fieldId}
				type="number"
				bind:value
				aria-invalid={invalid}
				oninput={() => onedit?.()}
			/>
		{:else}
			<!-- text + graceful fallback for any unknown field_type -->
			<Input
				id={fieldId}
				type="text"
				bind:value
				aria-invalid={invalid}
				oninput={() => onedit?.()}
			/>
		{/if}

		{#if error}
			<Field.Error>{error}</Field.Error>
		{/if}
	</Field.Field>
{/if}
