<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/state';

	// One sidebar menu row. States match Figma «Sidebar/Nav-punkt» (134:58):
	//  - default: no fill, body-grey text
	//  - hover:   muted fill, strong text
	//  - active:  white surface + 1px border, medium-weight text
	//  - focus:   2px blue focus ring
	// A transparent border is always reserved so the active border adds no shift.
	let {
		href,
		label,
		icon: Icon,
		badge
	}: {
		href: string;
		label: string;
		icon: Component<{ class?: string }>;
		badge?: number;
	} = $props();

	const active = $derived(
		page.url.pathname === href || page.url.pathname.startsWith(href + '/')
	);
</script>

<a
	{href}
	aria-current={active ? 'page' : undefined}
	class={[
		'group flex h-9 items-center gap-3 rounded-md border border-transparent px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
		active
			? 'border-border bg-card font-medium text-foreground'
			: 'font-normal text-text-body hover:bg-muted hover:text-foreground'
	]}
>
	<Icon class="size-[18px] shrink-0" />
	<span class="min-w-0 flex-1 truncate">{label}</span>
	{#if badge && badge > 0}
		<span
			class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-blue px-1.5 text-[11px] font-medium text-primary-foreground"
		>
			{badge}
		</span>
	{/if}
</a>
