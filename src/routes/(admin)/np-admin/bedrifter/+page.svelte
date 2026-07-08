<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import BusinessDrawer from './BusinessDrawer.svelte';
	import { bransjeLabel, formatLastActive } from './labels';
	import { initials } from '$lib/utils/format';
	import { BusinessesStatusOptions } from '$lib/pocketbase-types';
	import type { TableState } from '$lib/types';
	import type { PageData } from './$types';
	import type { OverviewRow, BusinessRow } from './+page';

	let { data }: { data: PageData } = $props();

	const overview = $derived(data.overview);
	const businessMap = $derived(new Map<string, BusinessRow>(data.businesses.map((b) => [b.id, b])));

	// --- KPI counts ----------------------------------------------------------
	const counts = $derived({
		total: overview.length,
		active: overview.filter((b) => b.status === BusinessesStatusOptions.active).length,
		onboarding: overview.filter((b) => b.status === BusinessesStatusOptions.onboarding).length,
		paused: overview.filter((b) => b.status === BusinessesStatusOptions.paused).length
	});

	// --- filters -------------------------------------------------------------
	let q = $state('');
	let bransjeFilter = $state('all');
	let statusFilter = $state('all');

	const BRANSJE_FILTERS = [
		{ value: 'all', label: 'Alle' },
		{ value: 'frisor', label: 'Frisør' },
		{ value: 'bilforhandler', label: 'Bilforhandler' },
		{ value: 'tomrer', label: 'Tømrer' },
		{ value: 'annet', label: 'Annet' }
	];
	const STATUS_FILTERS = [
		{ value: 'all', label: 'Alle' },
		{ value: BusinessesStatusOptions.active, label: 'Aktiv' },
		{ value: BusinessesStatusOptions.onboarding, label: 'Onboarding' },
		{ value: BusinessesStatusOptions.paused, label: 'Pauset' }
	];
	const bransjeFilterLabel = $derived(
		BRANSJE_FILTERS.find((f) => f.value === bransjeFilter)?.label ?? 'Alle'
	);
	const statusFilterLabel = $derived(
		STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? 'Alle'
	);

	const filtered = $derived.by(() => {
		const query = q.trim().toLowerCase();
		return overview.filter((b) => {
			if (bransjeFilter !== 'all' && b.type !== bransjeFilter) return false;
			if (statusFilter !== 'all' && b.status !== statusFilter) return false;
			if (query && !b.name.toLowerCase().includes(query)) return false;
			return true;
		});
	});

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/np-admin/bedrifter'
	);
	const tableState = $derived<TableState<OverviewRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: filtered
	});

	function refresh() {
		return invalidateAll();
	}

	// --- detail drawer -------------------------------------------------------
	let drawerOpen = $state(false);
	let selectedBusiness = $state<BusinessRow | null>(null);
	let selectedOverview = $state<OverviewRow | null>(null);

	function openBusiness(row: OverviewRow) {
		selectedBusiness = businessMap.get(row.id) ?? null;
		selectedOverview = row;
		drawerOpen = true;
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Bedrifter · NP Admin</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Bedrifter</h1>
			<p class="mt-1 text-sm text-muted-foreground">Alle kundene dine — status og moduler.</p>
		</div>
		<Button href="/np-admin/onboarding">
			<Plus class="size-4" />
			Ny bedrift
		</Button>
	</header>

	<!-- Nøkkeltall -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<KpiCard label="Bedrifter" value={counts.total} />
		<KpiCard label="Aktive" value={counts.active} />
		<KpiCard label="I onboarding" value={counts.onboarding} />
		<KpiCard label="På pause" value={counts.paused} />
	</div>

	<!-- Filtre -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative sm:max-w-xs sm:flex-1">
			<Search
				class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
			/>
			<Input
				name="bedrift-sok"
				type="search"
				aria-label="Søk på bedrift"
				placeholder="Søk på bedrift …"
				bind:value={q}
				class="pl-9"
			/>
		</div>
		<Select.Root type="single" bind:value={bransjeFilter}>
			<Select.Trigger class="sm:w-[190px]">Bransje: {bransjeFilterLabel}</Select.Trigger>
			<Select.Content>
				{#each BRANSJE_FILTERS as f (f.value)}
					<Select.Item value={f.value} label={f.label}>{f.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<Select.Root type="single" bind:value={statusFilter}>
			<Select.Trigger class="sm:w-[170px]">Status: {statusFilterLabel}</Select.Trigger>
			<Select.Content>
				{#each STATUS_FILTERS as f (f.value)}
					<Select.Item value={f.value} label={f.label}>{f.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Bedriftstabell -->
	<DataTable
		state={tableState}
		columns={7}
		onRetry={refresh}
		empty={overview.length === 0
			? {
					icon: Building2,
					title: 'Ingen bedrifter ennå',
					description: 'Nye kunder dukker opp her når de fullfører onboarding.'
				}
			: {
					icon: Search,
					title: 'Ingen treff',
					description: 'Prøv et annet søk eller filter.'
				}}
	>
		{#snippet header()}
			<th>Bedrift</th>
			<th class="w-[150px]">Bransje</th>
			<th class="w-[180px]">Pakke</th>
			<th class="w-[100px]">Moduler</th>
			<th class="w-[130px]">Status</th>
			<th class="w-[150px]">Sist aktiv</th>
			<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>
		{/snippet}
		{#snippet row(b)}
			<td>
				<button
					type="button"
					onclick={() => openBusiness(b)}
					class="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span
						class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-text-body"
						aria-hidden="true"
					>
						{initials(b.name)}
					</span>
					<span class="font-medium text-foreground">{b.name}</span>
				</button>
			</td>
			<td class="text-text-body">{bransjeLabel(b.type)}</td>
			<td class="text-text-body">{b.package_name || '—'}</td>
			<td class="tabular-nums text-text-body">{b.module_count ?? 0}</td>
			<td><StatusBadge collection="businesses" status={b.status} /></td>
			<td class="text-text-body">{formatLastActive(b.last_active)}</td>
			<td>
				<div class="flex justify-end">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {b.name}">
							<Ellipsis class="size-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onSelect={() => openBusiness(b)}>Åpne</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={() => openBusiness(b)}>Rediger moduler</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</td>
		{/snippet}
	</DataTable>
</div>

<BusinessDrawer
	bind:open={drawerOpen}
	business={selectedBusiness}
	overview={selectedOverview}
	onsaved={refresh}
/>
