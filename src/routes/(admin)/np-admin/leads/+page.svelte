<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Search from '@lucide/svelte/icons/search';
	import Inbox from '@lucide/svelte/icons/inbox';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import LeadDrawer from './LeadDrawer.svelte';
	import CallSlots from './CallSlots.svelte';
	import { formatDate } from '$lib/utils/format';
	import { AgencyLeadsStatusOptions, AgencyCallSlotsStatusOptions } from '$lib/pocketbase-types';
	import type { TableState } from '$lib/types';
	import type { PageData } from './$types';
	import type { LeadRow, CallSlotRow } from './+page';

	let { data }: { data: PageData } = $props();

	const leads = $derived(data.leads);
	const slots = $derived(data.slots);
	const people = $derived(data.people);

	// lead id → the slot that lead booked (for the drawer's «Booket prat»).
	const bookedByLead = $derived.by(() => {
		const map = new Map<string, CallSlotRow>();
		for (const s of slots) {
			if (s.status === AgencyCallSlotsStatusOptions.booked && s.lead) map.set(s.lead, s);
		}
		return map;
	});

	const counts = $derived({
		total: leads.length,
		new: leads.filter((l) => l.status === AgencyLeadsStatusOptions.new).length,
		in_dialog: leads.filter((l) => l.status === AgencyLeadsStatusOptions.in_dialog).length,
		won: leads.filter((l) => l.status === AgencyLeadsStatusOptions.won).length
	});

	let q = $state('');
	let statusFilter = $state('all');

	const STATUS_FILTERS = [
		{ value: 'all', label: 'Alle' },
		{ value: AgencyLeadsStatusOptions.new, label: 'Ny' },
		{ value: AgencyLeadsStatusOptions.in_dialog, label: 'I dialog' },
		{ value: AgencyLeadsStatusOptions.won, label: 'Vunnet' },
		{ value: AgencyLeadsStatusOptions.lost, label: 'Tapt' }
	];
	const statusFilterLabel = $derived(
		STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? 'Alle'
	);

	const filtered = $derived.by(() => {
		const query = q.trim().toLowerCase();
		return leads.filter((l) => {
			if (statusFilter !== 'all' && l.status !== statusFilter) return false;
			if (query && !`${l.name} ${l.company} ${l.email}`.toLowerCase().includes(query)) return false;
			return true;
		});
	});

	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/np-admin/leads'
	);
	const tableState = $derived<TableState<LeadRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: filtered
	});

	function refresh() {
		return invalidateAll();
	}

	let drawerOpen = $state(false);
	let selectedLead = $state<LeadRow | null>(null);

	function openLead(l: LeadRow) {
		selectedLead = l;
		drawerOpen = true;
	}
</script>

<svelte:head><title>Leads · NP Admin</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="min-w-0">
		<h1 class="text-2xl font-semibold text-foreground">Leads</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Henvendelser fra byråets nettside — nye kunder som tar kontakt.
		</p>
	</header>

	<!-- Nøkkeltall -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<KpiCard label="Leads totalt" value={counts.total} />
		<KpiCard label="Nye" value={counts.new} />
		<KpiCard label="I dialog" value={counts.in_dialog} />
		<KpiCard label="Vunnet" value={counts.won} />
	</div>

	<!-- Filtre -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative sm:max-w-xs sm:flex-1">
			<Search
				class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
			/>
			<Input
				name="lead-sok"
				type="search"
				aria-label="Søk på lead"
				placeholder="Søk på navn, bedrift eller e-post …"
				bind:value={q}
				class="pl-9"
			/>
		</div>
		<Select.Root type="single" bind:value={statusFilter}>
			<Select.Trigger class="sm:w-[170px]">Status: {statusFilterLabel}</Select.Trigger>
			<Select.Content>
				{#each STATUS_FILTERS as f (f.value)}
					<Select.Item value={f.value} label={f.label}>{f.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Leads-tabell -->
	<DataTable
		state={tableState}
		columns={6}
		onRetry={refresh}
		empty={leads.length === 0
			? {
					icon: Inbox,
					title: 'Ingen leads ennå',
					description: 'Henvendelser fra kontaktskjemaet på nettsiden dukker opp her.'
				}
			: {
					icon: Search,
					title: 'Ingen treff',
					description: 'Prøv et annet søk eller filter.'
				}}
	>
		{#snippet header()}
			<th>Navn</th>
			<th class="w-[180px]">Bedrift</th>
			<th class="w-[200px]">E-post</th>
			<th class="w-[150px]">Ansvarlig</th>
			<th class="w-[120px]">Status</th>
			<th class="w-[120px]">Mottatt</th>
		{/snippet}
		{#snippet row(l)}
			<td>
				<button
					type="button"
					onclick={() => openLead(l)}
					class="-mx-2 rounded-md px-2 py-1 text-left font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{l.name}
				</button>
			</td>
			<td class="text-text-body">{l.company || '—'}</td>
			<td class="truncate text-text-body">{l.email}</td>
			<td class="text-text-body">{l.expand?.assigned_to?.name ?? '—'}</td>
			<td><StatusBadge collection="agency_leads" status={l.status} /></td>
			<td class="text-text-body">{formatDate(l.created)}</td>
		{/snippet}
	</DataTable>

	<!-- Ledige prat-tider (felles pott → «Book en prat» på nettsiden) -->
	<CallSlots {slots} {leads} onchanged={refresh} />
</div>

<LeadDrawer
	bind:open={drawerOpen}
	lead={selectedLead}
	bookedSlot={selectedLead ? (bookedByLead.get(selectedLead.id) ?? null) : null}
	{people}
	onsaved={refresh}
/>
