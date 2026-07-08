<script lang="ts">
	import type { Component } from 'svelte';
	import Plus from '@lucide/svelte/icons/plus';

	// Floating action button — the mobile primary create action. Shown only on
	// mobile (<768px); on desktop the page keeps its header primary button, so the
	// FAB hides to honour «maks én svart primærknapp per skjerm». Sits bottom-right
	// above the 84px bottom tab bar, clear of the home-indicator safe area. No
	// box-shadow (design rule) — the black surface reads against the light canvas.
	let {
		onclick,
		label,
		icon: Icon = Plus
	}: {
		onclick: () => void;
		/** Accessible name, e.g. «Ny avtale». */
		label: string;
		icon?: Component<{ class?: string }>;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	aria-label={label}
	class="fixed right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
	style="bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px));"
>
	<Icon class="size-6" />
</button>
