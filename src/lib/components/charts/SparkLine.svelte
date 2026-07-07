<script lang="ts">
	type Props = {
		/** Series to plot, left → right. */
		values: number[];
		/** Index highlighted with an accent dot (e.g. the latest/peak point). */
		markedIndex?: number;
		width?: number;
		height?: number;
		ariaLabel?: string;
		class?: string;
	};

	let { values, markedIndex, width = 120, height = 32, ariaLabel, class: className = '' }: Props =
		$props();

	const PAD = 3;

	const geo = $derived.by(() => {
		const n = values.length;
		const min = Math.min(...values, 0);
		const max = Math.max(...values, 1);
		const span = max - min || 1;
		const innerW = Math.max(0, width - PAD * 2);
		const innerH = Math.max(0, height - PAD * 2);
		const pts = values.map((v, i) => {
			const x = PAD + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
			const y = PAD + innerH - ((v - min) / span) * innerH;
			return { x, y, v, i };
		});
		return { pts, poly: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') };
	});

	const marked = $derived(
		markedIndex != null && markedIndex >= 0 && markedIndex < geo.pts.length
			? geo.pts[markedIndex]
			: null
	);

	const label = $derived(ariaLabel ?? 'Trendlinje');
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	role="img"
	aria-label={label}
	class="block {className}"
>
	<title>{label}</title>
	{#if geo.pts.length > 1}
		<polyline
			points={geo.poly}
			fill="none"
			stroke="var(--foreground)"
			stroke-width="1.5"
			stroke-linejoin="round"
			stroke-linecap="round"
		/>
	{:else if geo.pts.length === 1}
		<line
			x1={PAD}
			y1={geo.pts[0].y}
			x2={width - PAD}
			y2={geo.pts[0].y}
			stroke="var(--foreground)"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
	{/if}
	{#if marked}
		<circle cx={marked.x} cy={marked.y} r="2.5" fill="var(--accent-blue)" />
	{/if}
</svg>
