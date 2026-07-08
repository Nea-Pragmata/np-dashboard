<script lang="ts" generics="T">
	import type { Component, Snippet } from 'svelte';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { Alert, AlertTitle, AlertDescription, AlertAction } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { TableState } from '$lib/types';
	import { cn } from '$lib/utils.js';

	type IconComponent = Component<{ class?: string }>;

	type EmptyConfig = {
		icon?: IconComponent;
		title: string;
		description?: string;
		/** Optional CTA rendered below the copy (e.g. «Nytt produkt»). */
		action?: Snippet;
	};

	let {
		state,
		header,
		row,
		empty,
		columns = 5,
		skeletonRows = 5,
		onRetry,
		class: className
	}: {
		/** Data + lifecycle. `items` are only read when `status === 'ready'`. */
		state: TableState<T>;
		/** Caps column-header cells — caller renders bare `<th>`s. */
		header: Snippet;
		/** One body row's cells — caller renders bare `<td>`s. */
		row: Snippet<[T, number]>;
		/** Shown when `ready` and `items` is empty. Falls back to a neutral copy. */
		empty?: EmptyConfig;
		/** Column count — drives skeleton cells. Keep in sync with `header`. */
		columns?: number;
		skeletonRows?: number;
		/** Called by the error-state «Prøv igjen» button, when provided. */
		onRetry?: () => void;
		class?: string;
	} = $props();

	// Cell padding + typography defaults so callers pass bare <th>/<td>. 16px
	// outer inset, 16px between cells (8+8), caps header, body uses --text-body.
	const cellPad =
		'[&>*]:px-2 [&>*:first-child]:pl-4 [&>*:last-child]:pr-4 [&>*]:align-middle';
	const headRow = cn(
		'h-10 border-b border-border',
		cellPad,
		"[&>th]:whitespace-nowrap [&>th]:text-left [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-muted-foreground"
	);
	const bodyRow = cn(
		'h-[52px] border-b border-border last:border-b-0 transition-colors hover:bg-muted',
		cellPad,
		'[&>td]:text-sm [&>td]:text-text-body'
	);

	const skeletonRowList = $derived(Array.from({ length: skeletonRows }, (_, i) => i));
	const skeletonColList = $derived(Array.from({ length: columns }, (_, i) => i));
</script>

<div class={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
	{#if state.status === 'loading'}
		<table class="w-full border-collapse">
			<thead>
				<tr class={headRow}>{@render header()}</tr>
			</thead>
			<tbody>
				{#each skeletonRowList as r (r)}
					<tr class={cn('h-[52px] border-b border-border last:border-b-0', cellPad)}>
						{#each skeletonColList as c (c)}
							<td><Skeleton class="h-4 w-full max-w-[180px]" /></td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if state.status === 'error'}
		<div class="p-6">
			<Alert variant="destructive">
				<TriangleAlertIcon />
				<AlertTitle>Kunne ikke laste inn</AlertTitle>
				<AlertDescription>
					{state.error ?? 'Noe gikk galt. Prøv igjen om litt.'}
				</AlertDescription>
				{#if onRetry}
					<AlertAction>
						<Button variant="outline" size="sm" onclick={onRetry}>Prøv igjen</Button>
					</AlertAction>
				{/if}
			</Alert>
		</div>
	{:else if state.items.length === 0}
		<EmptyState
			icon={empty?.icon}
			title={empty?.title ?? 'Ingen rader ennå'}
			description={empty?.description}
			action={empty?.action}
			class="py-12"
		/>
	{:else}
		<table class="w-full border-collapse">
			<thead>
				<tr class={headRow}>{@render header()}</tr>
			</thead>
			<tbody>
				{#each state.items as item, i (i)}
					<tr class={bodyRow}>{@render row(item, i)}</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
