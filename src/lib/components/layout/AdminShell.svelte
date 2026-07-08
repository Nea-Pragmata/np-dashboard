<script lang="ts" module>
	import type { Component } from 'svelte';

	type IconComponent = Component<{ class?: string }>;

	export interface AdminNavItem {
		label: string;
		href: string;
		icon: IconComponent;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Users from '@lucide/svelte/icons/users';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Plus from '@lucide/svelte/icons/plus';
	import FileText from '@lucide/svelte/icons/file-text';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Zap from '@lucide/svelte/icons/zap';
	import Shield from '@lucide/svelte/icons/shield';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { initials, roleLabel } from '$lib/utils/format';

	// Dark superadmin frame: a self-contained 248px DARK sidebar (admin tokens),
	// the shared light topbar showing «NP Admin», and a light content slot. The
	// dark styling is scoped locally here — NEVER a global `.dark` wrapper — so
	// shadcn overlays that portal to <body> stay light.
	let { children }: { children: Snippet } = $props();

	// The seven byrå-level sections, in Figma order (261:4865 / 264:4888).
	// Only «Bedrifter» and «Drift & status» are built this milestone; the rest
	// land in the next NP Admin milestone.
	const NAV: readonly AdminNavItem[] = [
		{ label: 'Bedrifter', href: '/np-admin/bedrifter', icon: Users },
		{ label: 'Leads', href: '/np-admin/leads', icon: Inbox },
		{ label: 'Onboarding', href: '/np-admin/onboarding', icon: Plus },
		{ label: 'Maler', href: '/np-admin/maler', icon: FileText },
		{ label: 'Pakker & priser', href: '/np-admin/pakker-priser', icon: CreditCard },
		{ label: 'Drift & status', href: '/np-admin/drift', icon: RefreshCw },
		{ label: 'AI-jobber', href: '/np-admin/ai-jobber', icon: Zap },
		{ label: 'Tilganger', href: '/np-admin/tilganger', icon: Shield }
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	const userName = $derived(auth.user?.name ?? auth.user?.email ?? '');
	const userInitials = $derived(initials(userName));
	const userRole = $derived(roleLabel(auth.agencyMember?.role ?? 'staff', true));

	// A byråansatt with a non-empty allow-list is scoped to a subset of the
	// businesses; surface that so they understand why they see fewer rows.
	const scopedCount = $derived(auth.allowedBusinesses.length);
	const isScoped = $derived(scopedCount > 0);

	function logout() {
		auth.logout();
		goto('/logg-inn');
	}
</script>

<div class="flex h-svh w-full overflow-hidden">
	<!-- Dark byrå sidebar -->
	<aside
		class="flex h-full w-[248px] shrink-0 flex-col border-r border-admin-border bg-admin-bg text-admin-fg"
	>
		<!-- Brand -->
		<div class="flex h-14 shrink-0 items-center gap-2 px-4">
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-md bg-admin-fg text-sm font-semibold text-admin-bg"
			>
				N
			</span>
			<span class="min-w-0 flex-1 truncate text-sm font-semibold text-admin-fg">NP Admin</span>
			<Shield class="size-[18px] shrink-0 text-admin-fg-muted" aria-hidden="true" />
		</div>

		<!-- Menu -->
		<nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-2">
			<div
				class="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-admin-fg-muted"
			>
				Byrånivå
			</div>
			{#each NAV as item (item.href)}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class={[
						'group flex h-9 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
						active
							? 'bg-admin-active font-medium text-admin-fg'
							: 'font-normal text-admin-fg-muted hover:bg-admin-surface hover:text-admin-fg'
					]}
				>
					<item.icon class="size-[18px] shrink-0" />
					<span class="min-w-0 flex-1 truncate">{item.label}</span>
				</a>
			{/each}

			{#if isScoped}
				<div
					class="mt-3 flex items-center gap-2 rounded-md border border-admin-border bg-admin-surface px-3 py-2 text-xs text-admin-fg-muted"
				>
					<Shield class="size-3.5 shrink-0" aria-hidden="true" />
					<span class="min-w-0 flex-1 truncate">
						Begrenset tilgang · {scopedCount} bedrifter
					</span>
				</div>
			{/if}
		</nav>

		<!-- Footer -->
		<div class="shrink-0 border-t border-admin-border px-4 py-3">
			<a
				href="/oversikt"
				class="group flex h-9 items-center gap-2 rounded-md px-3 text-sm font-normal text-admin-fg-muted outline-none transition-colors hover:bg-admin-surface hover:text-admin-fg focus-visible:ring-2 focus-visible:ring-sidebar-ring"
			>
				<ChevronLeft class="size-4 shrink-0" />
				<span class="min-w-0 flex-1 truncate">Til kundevisning</span>
			</a>
			<div class="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-full bg-admin-surface text-xs font-medium text-admin-fg"
				>
					{userInitials}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-admin-fg">{userName}</span>
					<span class="block truncate text-xs text-admin-fg-muted">{userRole}</span>
				</span>
				<button
					type="button"
					onclick={logout}
					aria-label="Logg ut"
					class="flex size-8 shrink-0 items-center justify-center rounded-md text-admin-fg-muted outline-none transition-colors hover:bg-admin-surface hover:text-admin-fg focus-visible:ring-2 focus-visible:ring-sidebar-ring"
				>
					<LogOut class="size-[18px]" />
				</button>
			</div>
		</div>
	</aside>

	<!-- Light content column -->
	<div class="flex min-w-0 flex-1 flex-col bg-background">
		<Topbar title="NP Admin" />
		<main class="min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
