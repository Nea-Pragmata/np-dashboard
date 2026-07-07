<script lang="ts">
	import type { Snippet } from 'svelte';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Shield from '@lucide/svelte/icons/shield';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import NavItem from '$lib/components/layout/NavItem.svelte';
	import TenantSwitcher from '$lib/components/layout/TenantSwitcher.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { pb } from '$lib/pb';
	import { filterNav, NAV_GROUPS } from '$lib/utils/modules';
	import { initials, businessTypeLabel, roleLabel } from '$lib/utils/format';
	import { Collections, InquiriesStatusOptions } from '$lib/pocketbase-types';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Menu, arranged per Figma: «Oversikt» pinned on top, DRIFT/VEKST/NETTSTED
	// groups in the middle, «Innstillinger» pinned to the footer.
	const items = $derived(filterNav(data.modules));
	const overview = $derived(items.find((i) => i.href === '/oversikt'));
	const settings = $derived(items.find((i) => i.href === '/innstillinger'));
	const groups = $derived(
		NAV_GROUPS.map((group) => ({
			label: group,
			items: items.filter(
				(i) => i.group === group && i.href !== '/oversikt' && i.href !== '/innstillinger'
			)
		})).filter((g) => g.items.length > 0)
	);

	const pageTitle = $derived(
		items.find(
			(i) => page.url.pathname === i.href || page.url.pathname.startsWith(i.href + '/')
		)?.label ?? ''
	);

	const userRole = $derived(
		roleLabel(
			auth.isAgency ? (auth.agencyMember?.role ?? 'staff') : (auth.user?.role ?? 'staff'),
			auth.isAgency
		)
	);
	const userInitials = $derived(initials(auth.user?.name ?? auth.user?.email ?? ''));

	// New-inquiry badge. Re-counts whenever the active business changes; realtime
	// can replace the poll in a later milestone.
	let inquiryBadge = $state(0);
	$effect(() => {
		const businessId = data.business?.id;
		if (!businessId) {
			inquiryBadge = 0;
			return;
		}
		let cancelled = false;
		pb.collection(Collections.Inquiries)
			.getList(1, 1, {
				filter: `business = "${businessId}" && status = "${InquiriesStatusOptions.new}"`,
				fields: 'id',
				requestKey: `inquiry-badge-${businessId}`
			})
			.then((result) => {
				if (!cancelled) inquiryBadge = result.totalItems;
			})
			.catch(() => {
				if (!cancelled) inquiryBadge = 0;
			});
		return () => {
			cancelled = true;
		};
	});

	function logout() {
		auth.logout();
		goto('/logg-inn');
	}
</script>

{#snippet sidebar()}
	<!-- Brand -->
	<div class="flex h-14 shrink-0 items-center gap-2 px-4">
		<span
			class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
		>
			N
		</span>
		<span class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">NP Dashboard</span>
		<button
			type="button"
			aria-label="Skjul sidepanel"
			class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<PanelLeft class="size-[18px]" />
		</button>
	</div>

	<!-- Tenant -->
	<div class="px-4 pb-2">
		{#if auth.isAgency}
			<TenantSwitcher businesses={data.businesses} current={data.business} />
		{:else}
			<div class="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-text-body"
				>
					{initials(data.business?.name ?? '')}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-foreground">
						{data.business?.name ?? ''}
					</span>
					<span class="block truncate text-xs text-muted-foreground">
						{data.business ? businessTypeLabel(data.business.type) : ''}
					</span>
				</span>
			</div>
		{/if}
	</div>

	<!-- Menu -->
	<nav class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-2">
		{#if overview}
			<NavItem href={overview.href} label={overview.label} icon={overview.icon} />
		{/if}
		{#each groups as group (group.label)}
			<div
				class="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.06em] text-text-subtle"
			>
				{group.label}
			</div>
			{#each group.items as item (item.href)}
				<NavItem
					href={item.href}
					label={item.label}
					icon={item.icon}
					badge={item.key === 'inquiries' ? inquiryBadge : undefined}
				/>
			{/each}
		{/each}
	</nav>

	<!-- Footer -->
	<div class="shrink-0 border-t border-border px-4 py-3">
		<div class="flex flex-col gap-1">
			{#if settings}
				<NavItem href={settings.href} label={settings.label} icon={settings.icon} />
			{/if}
			{#if auth.isAgency}
				<NavItem href="/np-admin" label="NP Admin" icon={Shield} />
			{/if}
		</div>
		<div class="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5">
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-text-body"
			>
				{userInitials}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium text-foreground">{auth.user?.name}</span>
				<span class="block truncate text-xs text-muted-foreground">{userRole}</span>
			</span>
			<button
				type="button"
				onclick={logout}
				aria-label="Logg ut"
				class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<LogOut class="size-[18px]" />
			</button>
		</div>
	</div>
{/snippet}

{#snippet topbar()}
	<Topbar title={pageTitle} />
{/snippet}

<AppShell {sidebar} {topbar}>
	{@render children()}
</AppShell>
