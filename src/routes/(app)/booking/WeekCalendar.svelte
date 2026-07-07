<script lang="ts" module>
	import { statusMeta, type StatusTone } from '$lib/components/shared/StatusBadge.svelte';

	/** Semantic tone → stripe background colour (block body stays monochrome). */
	const STRIPE_CLASS: Record<StatusTone, string> = {
		success: 'bg-success',
		warning: 'bg-warning',
		error: 'bg-error',
		info: 'bg-accent-blue',
		neutral: 'bg-muted-foreground'
	};

	type PlacedBooking = {
		booking: WeekBooking;
		topPct: number;
		heightPct: number;
		lane: number;
		lanes: number;
	};

	/**
	 * Pack a single day's bookings into side-by-side lanes so overlapping
	 * appointments (e.g. two chairs at 10:00) render next to each other instead of
	 * on top of one another. Lanes are computed per overlap-cluster with a
	 * first-fit sweep, so non-overlapping bookings still span the full width.
	 */
	function packDay(
		items: { booking: WeekBooking; startMin: number; endMin: number }[],
		gridStart: number,
		gridEnd: number
	): PlacedBooking[] {
		const span = gridEnd - gridStart;
		const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
		const out: PlacedBooking[] = [];
		let cluster: typeof sorted = [];
		let clusterEnd = -Infinity;

		const flush = () => {
			const laneEnds: number[] = [];
			const laneOf = new Map<(typeof cluster)[number], number>();
			for (const it of cluster) {
				let lane = laneEnds.findIndex((end) => end <= it.startMin);
				if (lane === -1) {
					lane = laneEnds.length;
					laneEnds.push(it.endMin);
				} else {
					laneEnds[lane] = it.endMin;
				}
				laneOf.set(it, lane);
			}
			const lanes = laneEnds.length;
			for (const it of cluster) {
				const top = Math.max(0, it.startMin - gridStart);
				const bottom = Math.min(span, it.endMin - gridStart);
				out.push({
					booking: it.booking,
					topPct: (top / span) * 100,
					heightPct: (Math.max(bottom - top, 12) / span) * 100,
					lane: laneOf.get(it) ?? 0,
					lanes
				});
			}
			cluster = [];
			clusterEnd = -Infinity;
		};

		for (const it of sorted) {
			if (cluster.length && it.startMin >= clusterEnd) flush();
			cluster.push(it);
			clusterEnd = Math.max(clusterEnd, it.endMin);
		}
		if (cluster.length) flush();
		return out;
	}
</script>

<script lang="ts">
	import { formatTime } from '$lib/utils/format';
	import { minutesOfDay } from './week';
	import type { WeekBooking } from './+page';

	type DayColumn = { iso: string; label: string; isToday: boolean; date: Date };

	let {
		days,
		bookings,
		startHour,
		endHour,
		onselect
	}: {
		days: DayColumn[];
		bookings: WeekBooking[];
		startHour: number;
		endHour: number;
		onselect: (booking: WeekBooking) => void;
	} = $props();

	const HOUR_HEIGHT = 56; // px per hour row

	const hours = $derived(
		Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
	);
	const bodyHeight = $derived((endHour - startHour) * HOUR_HEIGHT);
	const gridStartMin = $derived(startHour * 60);
	const gridEndMin = $derived(endHour * 60);

	// Bucket bookings into day columns (UTC day index, Monday = 0), then pack.
	const placedByDay = $derived.by(() => {
		const buckets: { booking: WeekBooking; startMin: number; endMin: number }[][] = days.map(
			() => []
		);
		for (const b of bookings) {
			const start = new Date(b.start);
			const dayIndex = (start.getUTCDay() + 6) % 7;
			if (dayIndex < 0 || dayIndex >= buckets.length) continue;
			const startMin = minutesOfDay(start);
			let endMin = minutesOfDay(new Date(b.end));
			if (endMin <= startMin) endMin = startMin + 15; // guard 0-length / bad data
			buckets[dayIndex].push({ booking: b, startMin, endMin });
		}
		return buckets.map((items) => packDay(items, gridStartMin, gridEndMin));
	});

	const gridCols = 'grid-template-columns: 52px repeat(7, minmax(116px, 1fr));';

	function timeLabel(h: number): string {
		return `${String(h).padStart(2, '0')}`;
	}
</script>

<div class="overflow-x-auto">
	<div style="min-width: 864px;">
		<!-- Day headers -->
		<div class="grid border-b border-border" style={gridCols}>
			<div class="border-r border-border"></div>
			{#each days as day (day.iso)}
				<div
					class="border-r border-border px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.06em] last:border-r-0"
					class:text-accent-blue-text={day.isToday}
					class:text-muted-foreground={!day.isToday}
				>
					{day.label}
				</div>
			{/each}
		</div>

		<!-- Time gutter + day columns -->
		<div class="grid" style={gridCols}>
			<!-- Gutter -->
			<div class="border-r border-border">
				{#each hours as h (h)}
					<div class="relative border-b border-border" style="height: {HOUR_HEIGHT}px;">
						<span
							class="absolute -top-2 right-2 text-[11px] tabular-nums text-text-subtle"
							class:opacity-0={h === startHour}
						>
							{timeLabel(h)}
						</span>
					</div>
				{/each}
			</div>

			<!-- Columns -->
			{#each days as day, di (day.iso)}
				<div
					class="relative border-r border-border last:border-r-0"
					class:bg-accent-blue-bg={day.isToday}
					style="height: {bodyHeight}px;"
				>
					<!-- Hour grid lines -->
					{#each hours as h (h)}
						<div class="border-b border-border" style="height: {HOUR_HEIGHT}px;"></div>
					{/each}

					<!-- Booking blocks -->
					{#each placedByDay[di] as p (p.booking.id)}
						{@const meta = statusMeta('bookings', p.booking.status)}
						{@const cancelled = p.booking.status === 'cancelled'}
						{@const gap = 3}
						<button
							type="button"
							onclick={() => onselect(p.booking)}
							title="{formatTime(p.booking.start)}–{formatTime(p.booking.end)} · {p.booking
								.customer_name || 'Uten navn'}"
							class="absolute overflow-hidden rounded-md border border-border bg-card pl-2 pr-1.5 py-1 text-left outline-none transition-shadow hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
							class:opacity-60={cancelled}
							style="top: {p.topPct}%; height: {p.heightPct}%; left: calc({(p.lane / p.lanes) *
								100}% + {gap}px); width: calc({100 / p.lanes}% - {gap * 2}px);"
						>
							<!-- Status stripe -->
							<span
								class="absolute inset-y-1 left-0 w-1 rounded-full {STRIPE_CLASS[meta.tone]}"
								aria-hidden="true"
							></span>
							<span
								class="block truncate pl-1.5 text-[12px] font-medium leading-tight text-foreground"
								class:line-through={cancelled}
							>
								<span class="tabular-nums text-text-subtle">{formatTime(p.booking.start)}</span>
								{p.booking.customer_name || 'Uten navn'}
							</span>
							<span class="block truncate pl-1.5 text-[11px] leading-tight text-muted-foreground">
								{p.booking.expand?.product?.name ?? '—'}
							</span>
						</button>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>
