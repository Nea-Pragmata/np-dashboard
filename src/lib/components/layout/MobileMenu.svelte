<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Shield from '@lucide/svelte/icons/shield';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { Sheet, SheetContent, SheetTitle, SheetDescription } from '$lib/components/ui/sheet';
	import type { NavItem } from '$lib/utils/modules';

	// Full-nav off-canvas drawer for mobile (Figma 285:5493 «Meny»). Opened by the
	// bottom «Meny» tab and the topbar hamburger. Reuses the same module-filtered
	// nav groups as the desktop sidebar, so it is module-aware for free. Closes on
	// any navigation.
	let {
		open = $bindable(false),
		businessName,
		businessType,
		businessInitials,
		groups,
		settings,
		isAgency = false,
		inquiryBadge = 0,
		userName,
		userRole,
		userInitials,
		onLogout
	}: {
		open?: boolean;
		businessName: string;
		businessType: string;
		businessInitials: string;
		groups: { label: string; items: NavItem[] }[];
		settings: NavItem | undefined;
		isAgency?: boolean;
		inquiryBadge?: number;
		userName: string;
		userRole: string;
		userInitials: string;
		onLogout: () => void;
	} = $props();

	afterNavigate(() => {
		open = false;
	});
</script>

<Sheet bind:open>
	<SheetContent side="left" class="w-[88vw] max-w-[360px] gap-0 p-0" showCloseButton={true}>
		<SheetTitle class="sr-only">Meny</SheetTitle>
		<SheetDescription class="sr-only">Naviger i {businessName}</SheetDescription>

		<!-- Virksomhet -->
		<div class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
			>
				{businessInitials || 'N'}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium text-foreground">{businessName}</span>
				<span class="block truncate text-xs text-muted-foreground">{businessType}</span>
			</span>
		</div>

		<!-- Meny -->
		<nav class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
			{#each groups as group (group.label)}
				<div
					class="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-text-subtle"
				>
					{group.label}
				</div>
				{#each group.items as item (item.href)}
					{@render row(item, item.key === 'inquiries' ? inquiryBadge : 0)}
				{/each}
			{/each}

			<div class="my-2 h-px bg-border" role="separator"></div>

			{#if settings}
				{@render row(settings, 0)}
			{/if}
			{#if isAgency}
				{@render row(
					{ key: 'always', group: 'NETTSTED', label: 'NP Admin', icon: Shield, href: '/np-admin' },
					0
				)}
			{/if}
		</nav>

		<!-- Bruker -->
		<div class="flex shrink-0 items-center gap-3 border-t border-border px-4 py-3">
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-text-body"
			>
				{userInitials}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium text-foreground">{userName}</span>
				<span class="block truncate text-xs text-muted-foreground">{userRole}</span>
			</span>
			<button
				type="button"
				onclick={onLogout}
				aria-label="Logg ut"
				class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
			>
				<LogOut class="size-[18px]" />
			</button>
		</div>
	</SheetContent>
</Sheet>

{#snippet row(item: NavItem, badge: number)}
	<a
		href={item.href}
		class="flex h-12 items-center gap-3 rounded-md px-3 text-sm text-text-body outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
	>
		<item.icon class="size-[18px] shrink-0" />
		<span class="min-w-0 flex-1 truncate">{item.label}</span>
		{#if badge > 0}
			<span
				class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-blue px-1.5 text-[11px] font-medium text-primary-foreground"
			>
				{badge}
			</span>
		{/if}
		<ChevronRight class="size-4 shrink-0 text-text-subtle" />
	</a>
{/snippet}
