<script lang="ts" module>
	import { statusMeta, type StatusTone } from '$lib/components/shared/StatusBadge.svelte';

	/** Semantic tone → stripe colour (mirrors the week grid). */
	const STRIPE_CLASS: Record<StatusTone, string> = {
		success: 'bg-success',
		warning: 'bg-warning',
		error: 'bg-error',
		info: 'bg-accent-blue',
		neutral: 'bg-muted-foreground'
	};
</script>

<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { formatTime } from '$lib/utils/format';
	import { BookingsStatusOptions } from '$lib/pocketbase-types';
	import type { WeekBooking } from './+page';

	// Single-day agenda for mobile (Figma 285:5493 «dagsvisning»). Reuses the week
	// load; the parent filters to the selected day and owns day navigation (local
	// within the loaded week, `goto` when crossing the week boundary).
	let {
		bookings,
		dayLabel,
		isToday,
		onselect,
		onPrev,
		onNext,
		onToday
	}: {
		bookings: WeekBooking[];
		dayLabel: string;
		isToday: boolean;
		onselect: (booking: WeekBooking) => void;
		onPrev: () => void;
		onNext: () => void;
		onToday: () => void;
	} = $props();
</script>

<div class="flex flex-col gap-4">
	<!-- Dagnavigator -->
	<div class="flex items-center gap-2">
		<div class="flex items-center">
			<Button variant="outline" size="icon" class="rounded-r-none" aria-label="Forrige dag" onclick={onPrev}>
				<ChevronLeft class="size-4" />
			</Button>
			<Button
				variant="outline"
				size="icon"
				class="-ml-px rounded-l-none"
				aria-label="Neste dag"
				onclick={onNext}
			>
				<ChevronRight class="size-4" />
			</Button>
		</div>
		<span
			class="ml-1 min-w-0 flex-1 truncate text-sm font-medium text-foreground first-letter:uppercase"
		>
			{dayLabel}
		</span>
		<Button variant="outline" size="sm" onclick={onToday} disabled={isToday}>I dag</Button>
	</div>

	<!-- Agenda -->
	{#if bookings.length === 0}
		<div class="rounded-lg border border-border bg-card">
			<EmptyState
				icon={CalendarDays}
				title="Ingen avtaler"
				description="Ingen avtaler denne dagen."
				class="py-10"
			/>
		</div>
	{:else}
		<ul class="overflow-hidden rounded-lg border border-border bg-card">
			{#each bookings as b (b.id)}
				{@const meta = statusMeta('bookings', b.status)}
				{@const cancelled = b.status === BookingsStatusOptions.cancelled}
				<li class="border-b border-border last:border-b-0">
					<button
						type="button"
						onclick={() => onselect(b)}
						class="flex w-full items-stretch gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
						class:opacity-60={cancelled}
					>
						<span class="w-1 shrink-0 rounded-full {STRIPE_CLASS[meta.tone]}" aria-hidden="true"></span>
						<span class="w-12 shrink-0 tabular-nums">
							<span class="block text-sm font-medium text-foreground">{formatTime(b.start)}</span>
							<span class="block text-xs text-muted-foreground">{formatTime(b.end)}</span>
						</span>
						<span class="min-w-0 flex-1">
							<span
								class="block truncate text-sm font-medium text-foreground"
								class:line-through={cancelled}
							>
								{b.customer_name || 'Uten navn'}
							</span>
							<span class="block truncate text-sm text-muted-foreground">
								{b.expand?.product?.name ?? '—'}
							</span>
						</span>
						<span class="shrink-0 self-center">
							<StatusBadge collection="bookings" status={b.status} />
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
