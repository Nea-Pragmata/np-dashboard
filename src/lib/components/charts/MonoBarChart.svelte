<script lang="ts">
	import { formatNumber } from '$lib/utils/format';

	type BarDatum = { label: string; value: number };

	let {
		data,
		markedIndex,
		height = 240,
		formatValue = formatNumber,
		valueSuffix = '',
		ariaLabel,
		class: className = ''
	}: {
		/** Bars in render order; `label` is the x-axis tick, `value` the height. */
		data: BarDatum[];
		/** Bar drawn in the accent colour when nothing is hovered (e.g. the peak). */
		markedIndex?: number;
		/** Total SVG height in px (includes the x-axis label row). */
		height?: number;
		/** Formats y-axis ticks + tooltip value. Defaults to space-grouped ints. */
		formatValue?: (v: number) => string;
		/** Appended after the value in the tooltip, e.g. " besøk". */
		valueSuffix?: string;
		/** Overrides the generated aria-label / title summary. */
		ariaLabel?: string;
		class?: string;
	} = $props();

	// Inner plot insets: room for y-tick labels (left) and x-tick labels (bottom).
	const PAD = { top: 12, right: 8, bottom: 22, left: 36 };
	const MAX_BAR = 18;
	const TICKS = 4;

	let width = $state(0);
	let hovered = $state<number | null>(null);

	/** Round `range` to a 1/2/5·10ⁿ "nice" number (ceil when `round`). */
	function niceNum(range: number, round: boolean): number {
		if (range <= 0) return 1;
		const exp = Math.floor(Math.log10(range));
		const frac = range / 10 ** exp;
		let nice: number;
		if (round) nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
		else nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
		return nice * 10 ** exp;
	}

	const geo = $derived.by(() => {
		const n = data.length;
		const innerW = Math.max(0, width - PAD.left - PAD.right);
		const innerH = Math.max(0, height - PAD.top - PAD.bottom);
		const maxVal = Math.max(0, ...data.map((d) => d.value));

		// Integer-friendly gridline ticks (excluding the 0 baseline).
		const spacing = Math.max(1, Math.round(niceNum(Math.max(1, maxVal) / TICKS, true)));
		const niceMax = Math.max(spacing, Math.ceil(maxVal / spacing) * spacing);
		const ticks: number[] = [];
		for (let v = spacing; v <= niceMax + 0.5; v += spacing) ticks.push(v);

		const slot = n > 0 ? innerW / n : innerW;
		const barW = Math.max(2, Math.min(MAX_BAR, slot * 0.62));

		// Thin x-axis labels so they never collide (~64px each).
		const maxLabels = Math.max(2, Math.floor(innerW / 64));
		const step = Math.max(1, Math.ceil(n / maxLabels));

		const bars = data.map((d, i) => {
			const h = niceMax > 0 ? (d.value / niceMax) * innerH : 0;
			const slotX = PAD.left + slot * i;
			const x = slotX + (slot - barW) / 2;
			const y = PAD.top + innerH - h;
			const showLabel = n <= 12 || i % step === 0 || i === n - 1;
			return { ...d, i, x, y, h, slotX, slotW: slot, cx: x + barW / 2, showLabel };
		});

		return { n, innerW, innerH, maxVal, niceMax, ticks, barW, bars, baseY: PAD.top + innerH };
	});

	const active = $derived(
		hovered != null ? hovered : markedIndex != null && markedIndex >= 0 ? markedIndex : null
	);
	const activeBar = $derived(active != null ? geo.bars[active] : null);

	/** Rect path with only the two top corners rounded. */
	function topRectPath(x: number, y: number, w: number, h: number, r: number): string {
		if (h <= 0) return '';
		const rr = Math.min(r, w / 2, h);
		return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
	}

	const summary = $derived(
		ariaLabel ??
			`Stolpediagram med ${geo.n} punkter. Høyeste verdi ${formatValue(geo.maxVal)}${valueSuffix}.`
	);
</script>

<div class="relative w-full {className}" style="height: {height}px" bind:clientWidth={width}>
	{#if width > 0}
		<svg {width} {height} role="img" aria-label={summary} class="block overflow-visible">
			<title>{summary}</title>

			{#each geo.ticks as t (t)}
				{@const y = PAD.top + geo.innerH - (t / geo.niceMax) * geo.innerH}
				<line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke="var(--muted)" stroke-width="1" />
				<text
					x={PAD.left - 8}
					y={y + 4}
					text-anchor="end"
					class="fill-[var(--text-subtle)] text-[11px] tabular-nums">{formatValue(t)}</text
				>
			{/each}

			<line
				x1={PAD.left}
				y1={geo.baseY}
				x2={width - PAD.right}
				y2={geo.baseY}
				stroke="var(--border)"
				stroke-width="1"
			/>

			{#each geo.bars as b (b.i)}
				{#if b.h > 0}
					<path
						d={topRectPath(b.x, b.y, geo.barW, b.h, 3)}
						fill={active === b.i ? 'var(--accent-blue)' : 'var(--foreground)'}
					/>
				{/if}
				{#if b.showLabel}
					<text x={b.cx} y={height - 6} text-anchor="middle" class="fill-[var(--text-subtle)] text-[11px]"
						>{b.label}</text
					>
				{/if}
				<rect
					x={b.slotX}
					y={PAD.top}
					width={b.slotW}
					height={geo.innerH}
					fill="transparent"
					role="presentation"
					onpointerenter={() => (hovered = b.i)}
				/>
			{/each}

			<rect
				x={PAD.left}
				y={PAD.top}
				width={geo.innerW}
				height={geo.innerH}
				fill="transparent"
				role="presentation"
				onpointerleave={() => (hovered = null)}
			/>
		</svg>

		{#if activeBar && activeBar.h > 0}
			<div
				class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[12px] font-medium text-background"
				style="left: {activeBar.cx}px; top: {activeBar.y - 6}px"
			>
				{activeBar.label} · {formatValue(activeBar.value)}{valueSuffix}
			</div>
		{/if}
	{/if}
</div>
