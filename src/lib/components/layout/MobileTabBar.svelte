<script lang="ts">
	import { page } from '$app/state';
	import House from '@lucide/svelte/icons/house';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import { mobilePrimaryNav, type BusinessModules, type NavItem } from '$lib/utils/modules';
	import { cn } from '$lib/utils.js';

	// Bottom tab bar (mobile only, per Figma 285:5493). Four slots at most:
	// «Oversikt» first, then up to two module-gated primary tabs, then «Meny»
	// (opens the full-nav sheet). Module-aware via {@link mobilePrimaryNav}: a
	// tenant lacking booking/inquiries gets its own primary modules; a pure-website
	// tenant (no operational module) shows Oversikt / Nettsted / Meny.
	let {
		modules,
		inquiryBadge = 0,
		onMenuClick
	}: {
		modules: BusinessModules | null | undefined;
		inquiryBadge?: number;
		onMenuClick: () => void;
	} = $props();

	const overview: NavItem = {
		key: 'always',
		group: 'DRIFT',
		label: 'Oversikt',
		icon: House,
		href: '/oversikt'
	};
	const middle = $derived(mobilePrimaryNav(modules));

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	// Active = dark strong text/icon (Figma 285:5522); inactive = muted. The badge
	// keeps the blue accent (a micro-point, per «blå aksent kun på mikropunkter»).
	const tabBase =
		'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring';
</script>

<nav
	aria-label="Hovedmeny"
	class="flex shrink-0 items-stretch border-t border-border bg-card px-2 pt-2"
	style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));"
>
	<a
		href={overview.href}
		aria-current={isActive(overview.href) ? 'page' : undefined}
		class={cn(tabBase, isActive(overview.href) ? 'font-medium text-foreground' : 'text-muted-foreground')}
	>
		<overview.icon class="size-[22px]" />
		<span class="truncate">{overview.label}</span>
	</a>

	{#each middle as item (item.href)}
		{@const active = isActive(item.href)}
		{@const badge = item.key === 'inquiries' ? inquiryBadge : 0}
		<a
			href={item.href}
			aria-current={active ? 'page' : undefined}
			class={cn(tabBase, active ? 'font-medium text-foreground' : 'text-muted-foreground')}
		>
			<span class="relative">
				<item.icon class="size-[22px]" />
				{#if badge > 0}
					<span
						class="absolute -right-2 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent-blue px-1 text-[9px] font-medium text-primary-foreground"
					>
						{badge}
					</span>
				{/if}
			</span>
			<span class="truncate">{item.label}</span>
		</a>
	{/each}

	<button type="button" onclick={onMenuClick} class={cn(tabBase, 'text-muted-foreground')}>
		<PanelLeft class="size-[22px]" />
		<span class="truncate">Meny</span>
	</button>
</nav>
