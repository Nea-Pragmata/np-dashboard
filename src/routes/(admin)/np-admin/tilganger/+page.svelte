<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Shield from '@lucide/svelte/icons/shield';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import MemberDrawer from './MemberDrawer.svelte';
	import { pb } from '$lib/pb';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import { initials } from '$lib/utils/format';
	import { Collections } from '$lib/pocketbase-types';
	import {
		agencyRoleLabel,
		memberStatusMeta,
		scopeLabel,
		formatLastActive,
		TONE_BADGE
	} from './access';
	import type { TableState } from '$lib/types';
	import type { PageData } from './$types';
	import type { MemberRow } from './+page';

	let { data }: { data: PageData } = $props();

	const members = $derived(data.members);
	const isOwner = $derived(auth.agencyMember?.role === 'owner');
	const currentUserId = $derived(auth.user?.id ?? '');

	// Byråeier first, then by name — mirrors the Figma order.
	const sorted = $derived(
		[...members].sort((a, b) => {
			if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
			const an = a.expand?.user?.name ?? '';
			const bn = b.expand?.user?.name ?? '';
			return an.localeCompare(bn, 'nb');
		})
	);

	function memberName(m: MemberRow): string {
		return m.expand?.user?.name || m.expand?.user?.email || 'Ukjent bruker';
	}
	// A member may not edit or remove their OWN access (no self-lockout, no
	// self-escalation) — matches the Figma (the owner row has no action menu).
	function canManage(m: MemberRow): boolean {
		return isOwner && m.user !== currentUserId;
	}

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/np-admin/tilganger'
	);
	const tableState = $derived<TableState<MemberRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: sorted
	});
	const columns = $derived(isOwner ? 6 : 5);

	function refresh() {
		return invalidateAll();
	}

	// --- drawer + delete -----------------------------------------------------
	let drawerOpen = $state(false);
	let editing = $state<MemberRow | null>(null);

	function openInvite() {
		editing = null;
		drawerOpen = true;
	}
	function openEdit(m: MemberRow) {
		if (!canManage(m)) return;
		editing = m;
		drawerOpen = true;
	}

	let confirmOpen = $state(false);
	let toRemove = $state<MemberRow | null>(null);
	function askRemove(m: MemberRow) {
		toRemove = m;
		confirmOpen = true;
	}
	async function doRemove() {
		const m = toRemove;
		if (!m) return;
		try {
			await pb.collection(Collections.AgencyMembers).delete(m.id);
			toast.success('Tilgangen er fjernet.');
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke fjerne tilgangen.');
		}
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Tilganger · NP Admin</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Tilganger</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Hvem i byrået som har tilgang til NP Admin — og til hvilke bedrifter.
			</p>
		</div>
		{#if isOwner}
			<Button onclick={openInvite}>
				<Plus class="size-4" />
				Inviter byråbruker
			</Button>
		{/if}
	</header>

	<!-- Medlemmer -->
	<DataTable
		state={tableState}
		{columns}
		onRetry={refresh}
		empty={{
			icon: Shield,
			title: 'Ingen byråbrukere ennå',
			description: 'Inviter kolleger for å gi dem tilgang til NP Admin.'
		}}
	>
		{#snippet header()}
			<th>Bruker</th>
			<th class="w-[150px]">Rolle</th>
			<th class="w-[170px]">Bedrifter</th>
			<th class="w-[150px]">Sist aktiv</th>
			<th class="w-[120px]">Status</th>
			{#if isOwner}
				<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>
			{/if}
		{/snippet}
		{#snippet row(m)}
			{@const meta = memberStatusMeta(m.status)}
			{@const scoped = (m.allowed_businesses?.length ?? 0) > 0}
			<td>
				<div class="flex items-center gap-3">
					<span
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-text-body"
						aria-hidden="true"
					>
						{initials(memberName(m))}
					</span>
					<span class="min-w-0">
						<span class="block truncate text-sm font-medium text-foreground">{memberName(m)}</span>
						<span class="block truncate text-xs text-muted-foreground">
							{m.expand?.user?.email ?? '—'}
						</span>
					</span>
				</div>
			</td>
			<td class="text-text-body">{agencyRoleLabel(m.role)}</td>
			<td>
				{#if scoped && canManage(m)}
					<button
						type="button"
						onclick={() => openEdit(m)}
						class="rounded text-sm font-medium text-accent-blue-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
					>
						{scopeLabel(m.allowed_businesses)}
					</button>
				{:else if scoped}
					<span class="text-sm font-medium text-accent-blue-text">
						{scopeLabel(m.allowed_businesses)}
					</span>
				{:else}
					<span class="text-text-body">{scopeLabel(m.allowed_businesses)}</span>
				{/if}
			</td>
			<td class="text-text-body">{formatLastActive(m.expand?.user?.last_active)}</td>
			<td>
				<Badge
					class={cn(
						'h-[22px] gap-1.5 rounded-full border-transparent px-2 text-xs font-medium',
						TONE_BADGE[meta.tone]
					)}
				>
					<span
						class="size-1.5 shrink-0 rounded-full bg-current opacity-80"
						aria-hidden="true"
					></span>
					{meta.label}
				</Badge>
			</td>
			{#if isOwner}
				<td>
					<div class="flex justify-end">
						{#if canManage(m)}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {memberName(m)}">
									<Ellipsis class="size-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => openEdit(m)}>Rediger</DropdownMenu.Item>
									<DropdownMenu.Item variant="destructive" onSelect={() => askRemove(m)}>
										Fjern tilgang
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>
				</td>
			{/if}
		{/snippet}
	</DataTable>

	<!-- Info: roller + synlighet -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
			<h2 class="text-base font-semibold text-foreground">Roller</h2>
			<dl class="flex flex-col gap-2.5">
				<div class="flex items-start gap-3">
					<dt>
						<span
							class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-body"
						>
							Byråeier
						</span>
					</dt>
					<dd class="text-sm text-muted-foreground">
						Full tilgang: bedrifter, priser, tilganger og AI-jobber.
					</dd>
				</div>
				<div class="flex items-start gap-3">
					<dt>
						<span
							class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-body"
						>
							Byråansatt
						</span>
					</dt>
					<dd class="text-sm text-muted-foreground">
						Drift og innhold for tildelte bedrifter. Ser ikke Pakker &amp; priser eller Tilganger.
					</dd>
				</div>
			</dl>
		</section>
		<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
			<h2 class="text-base font-semibold text-foreground">Synlighet i kundedashbordet</h2>
			<p class="text-sm text-muted-foreground">
				Punktet «NP Admin» i kundens meny vises bare for byråbrukere som er logget inn hos kunden.
				Bedriftens egne brukere ser det aldri.
			</p>
		</section>
	</div>
</div>

<MemberDrawer bind:open={drawerOpen} member={editing} businesses={data.businesses} onsaved={refresh} />

<ConfirmDialog
	bind:open={confirmOpen}
	title="Fjerne tilgangen?"
	description={toRemove
		? `${memberName(toRemove)} mister tilgang til NP Admin.`
		: undefined}
	confirmLabel="Fjern tilgang"
	destructive
	onconfirm={doRemove}
/>
