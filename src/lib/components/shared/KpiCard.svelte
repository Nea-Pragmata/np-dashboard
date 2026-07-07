<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import { formatKr, formatNumber } from '$lib/utils/format';

	type IconComponent = Component<{ class?: string }>;

	type Trend = {
		direction: 'up' | 'down' | 'neutral';
		/** Pre-formatted delta, e.g. "+12 %" or "+3". */
		delta: string;
		/** Optional context, e.g. "siste 30 dager". */
		period?: string;
	};

	let {
		label,
		value,
		format = 'number',
		icon,
		trend,
		sparkline
	}: {
		label: string;
		value: number | string;
		/** How a numeric `value` is rendered (ignored for string values). */
		format?: 'number' | 'kr';
		icon?: IconComponent;
		trend?: Trend;
		/** Optional mini-chart rendered under the value (none this milestone). */
		sparkline?: Snippet;
	} = $props();

	const Icon = $derived(icon);
	const display = $derived(
		typeof value === 'number' ? (format === 'kr' ? formatKr(value) : formatNumber(value)) : value
	);
</script>

<div class="flex min-h-[120px] flex-col gap-2 rounded-lg border border-border bg-card p-5">
	<div class="flex items-center gap-2">
		<p class="flex-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
			{label}
		</p>
		{#if Icon}
			<Icon class="size-4 shrink-0 text-text-subtle" />
		{/if}
	</div>
	<p class="text-[30px] font-semibold leading-9 tabular-nums text-foreground">{display}</p>
	{#if trend}
		<div class="flex items-center gap-1 text-xs">
			{#if trend.direction === 'up'}
				<TrendingUp class="size-3.5 text-success" />
				<span class="font-medium text-success">{trend.delta}</span>
			{:else if trend.direction === 'down'}
				<TrendingDown class="size-3.5 text-error" />
				<span class="font-medium text-error">{trend.delta}</span>
			{:else}
				<span class="font-medium text-muted-foreground">{trend.delta}</span>
			{/if}
			{#if trend.period}
				<span class="text-muted-foreground">{trend.period}</span>
			{/if}
		</div>
	{/if}
	{#if sparkline}
		<div class="mt-auto pt-1">{@render sparkline()}</div>
	{/if}
</div>
