<script lang="ts">
	import { navigating } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Users from '@lucide/svelte/icons/users';
	import Mail from '@lucide/svelte/icons/mail';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import CustomerDrawer from './CustomerDrawer.svelte';
	import { formatDate, formatNumber, initials } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import type { TableState } from '$lib/types';
	import { cn } from '$lib/utils.js';
	import type { PageData } from './$types';
	import type { CustomerRow } from './+page';

	let { data }: { data: PageData } = $props();

	const customers = $derived(data.customers);
	const businessId = $derived(data.business?.id ?? '');

	// --- consent + loyalty helpers -------------------------------------------
	// GDPR-critical: only ever read `=== true`. A missing/false flag is NOT
	// consent, so the icon stays hidden — we never imply a consent the data lacks.
	function emailConsent(c: CustomerRow): boolean {
		return c.consents?.email === true;
	}
	function smsConsent(c: CustomerRow): boolean {
		return c.consents?.sms === true;
	}

	/** Normalised punch card, or null when the customer has no loyalty card. */
	function punch(c: CustomerRow): { count: number; goal: number } | null {
		const pc = c.punch_card;
		const goal = Math.round(Number(pc?.goal) || 0);
		if (!pc || goal <= 0) return null;
		const count = Math.min(Math.max(Math.round(Number(pc.count) || 0), 0), goal);
		return { count, goal };
	}

	// --- filters -------------------------------------------------------------
	let q = $state('');
	let consentFilter = $state('all');
	let sortBy = $state('last_visit');

	const CONSENT_FILTERS = [
		{ value: 'all', label: 'Alle' },
		{ value: 'email', label: 'E-post' },
		{ value: 'sms', label: 'SMS' },
		{ value: 'none', label: 'Ingen' }
	];
	const SORTS = [
		{ value: 'last_visit', label: 'Sist besøk' },
		{ value: 'name', label: 'Navn' }
	];
	const consentFilterLabel = $derived(
		CONSENT_FILTERS.find((f) => f.value === consentFilter)?.label ?? 'Alle'
	);
	const sortLabel = $derived(SORTS.find((s) => s.value === sortBy)?.label ?? 'Sist besøk');

	const filtered = $derived.by(() => {
		const query = q.trim().toLowerCase();
		const rows = customers.filter((c) => {
			if (consentFilter === 'email' && !emailConsent(c)) return false;
			if (consentFilter === 'sms' && !smsConsent(c)) return false;
			if (consentFilter === 'none' && (emailConsent(c) || smsConsent(c))) return false;
			if (query) {
				const hay = `${c.name} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase();
				if (!hay.includes(query)) return false;
			}
			return true;
		});
		if (sortBy === 'name') {
			return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
		}
		// Sist besøk: newest first; customers without a visit sort last.
		return [...rows].sort((a, b) => (b.last_visit ?? '').localeCompare(a.last_visit ?? ''));
	});

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/kunder'
	);
	const tableState = $derived<TableState<CustomerRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: filtered
	});

	function refresh() {
		return invalidateAll();
	}

	function openCustomer(c: CustomerRow) {
		goto(`/kunder/${c.id}`);
	}

	// --- create / edit -------------------------------------------------------
	let drawerOpen = $state(false);
	let editing = $state<CustomerRow | null>(null);

	function openNew() {
		editing = null;
		drawerOpen = true;
	}
	function openEdit(c: CustomerRow) {
		editing = c;
		drawerOpen = true;
	}

	// --- delete (owner-only per API rule — the demo logs in as owner) ---------
	let deleteOpen = $state(false);
	let deleteTarget = $state<CustomerRow | null>(null);
	function askDelete(c: CustomerRow) {
		deleteTarget = c;
		deleteOpen = true;
	}
	async function confirmDelete() {
		const c = deleteTarget;
		if (!c) return;
		try {
			await pb.collection(Collections.Customers).delete(c.id);
			toast.success('Kunden er slettet.');
			await refresh();
		} catch (e) {
			// Staff (non-owner) get 403/404 here — surface a friendly bokmål toast.
			toast.error(pbError(e));
		}
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Kunder · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Kunder</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Kundene dine — med samtykker og klippekort.
			</p>
		</div>
		<Button variant={customers.length > 0 ? 'default' : 'outline'} onclick={openNew}>
			<Plus class="size-4" />
			Ny kunde
		</Button>
	</header>

	<!-- Filtre -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative sm:max-w-xs sm:flex-1">
			<Search
				class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
			/>
			<Input
				name="kunder-sok"
				type="search"
				aria-label="Søk på navn eller telefon"
				placeholder="Søk på navn eller telefon …"
				bind:value={q}
				class="pl-9"
			/>
		</div>
		<Select.Root type="single" bind:value={consentFilter}>
			<Select.Trigger class="sm:w-[180px]">Samtykke: {consentFilterLabel}</Select.Trigger>
			<Select.Content>
				{#each CONSENT_FILTERS as f (f.value)}
					<Select.Item value={f.value} label={f.label}>{f.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		<Select.Root type="single" bind:value={sortBy}>
			<Select.Trigger class="sm:w-[200px]">Sortert på: {sortLabel}</Select.Trigger>
			<Select.Content>
				{#each SORTS as s (s.value)}
					<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Kundetabell -->
	<DataTable
		state={tableState}
		columns={7}
		onRetry={refresh}
		empty={customers.length === 0
			? {
					icon: Users,
					title: 'Ingen kunder ennå',
					description:
						'Legg til den første kunden, eller la nettsidens skjema og booking fylle opp registeret.',
					action: newCustomerCta
				}
			: {
					icon: Search,
					title: 'Ingen treff',
					description: 'Prøv et annet søk eller filter.'
				}}
	>
		{#snippet header()}
			<th>Kunde</th>
			<th class="w-[160px]">Telefon</th>
			<th class="w-[150px]">Siste besøk</th>
			<th class="w-[90px]"><div class="text-right">Besøk</div></th>
			<th class="w-[130px]">Klippekort</th>
			<th class="w-[130px]">Samtykke</th>
			<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>
		{/snippet}
		{#snippet row(c)}
			{@const pc = punch(c)}
			<td>
				<a
					href="/kunder/{c.id}"
					class="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span
						class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-text-body"
						aria-hidden="true"
					>
						{initials(c.name)}
					</span>
					<span class="font-medium text-foreground">{c.name}</span>
				</a>
			</td>
			<td class="text-text-body">{c.phone || c.email || '—'}</td>
			<td class="text-text-body">{c.last_visit ? formatDate(c.last_visit) : '—'}</td>
			<td class="text-right tabular-nums text-text-body">{formatNumber(c.visit_count ?? 0)}</td>
			<td>
				{#if pc && pc.count >= pc.goal}
					<Badge
						class="h-[22px] gap-1.5 rounded-full border-transparent bg-success-bg px-2 text-xs font-medium text-success"
					>
						<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"
						></span>
						Fullt!
					</Badge>
				{:else if pc}
					<span class="tabular-nums text-text-body">{pc.count} av {pc.goal}</span>
				{:else}
					<span class="text-text-subtle">—</span>
				{/if}
			</td>
			<td>
				{#if emailConsent(c) || smsConsent(c)}
					<span class="flex items-center gap-2 text-text-body">
						{#if emailConsent(c)}
							<Mail class="size-[15px]" aria-label="Samtykke til e-post" />
						{/if}
						{#if smsConsent(c)}
							<Smartphone class="size-[15px]" aria-label="Samtykke til SMS" />
						{/if}
					</span>
				{:else}
					<span class="text-text-subtle" aria-label="Ingen samtykker">—</span>
				{/if}
			</td>
			<td>
				<div class="flex justify-end">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {c.name}">
							<Ellipsis class="size-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onSelect={() => openCustomer(c)}>Åpne kundekort</DropdownMenu.Item>
							<DropdownMenu.Item onSelect={() => openEdit(c)}>Rediger</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								class="text-destructive data-highlighted:text-destructive"
								onSelect={() => askDelete(c)}
							>
								Slett
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</td>
		{/snippet}
	</DataTable>
</div>

<!-- Svart primærknapp i tom tilstand -->
{#snippet newCustomerCta()}
	<Button onclick={openNew}>
		<Plus class="size-4" />
		Ny kunde
	</Button>
{/snippet}

<!-- Skuff + bekreftelse -->
<CustomerDrawer bind:open={drawerOpen} customer={editing} {businessId} onsaved={refresh} />
<ConfirmDialog
	bind:open={deleteOpen}
	title="Slette kunden?"
	description={deleteTarget
		? `«${deleteTarget.name}» slettes med all klippekort- og samtykkeinformasjon. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Slett"
	cancelLabel="Avbryt"
	destructive
	onconfirm={confirmDelete}
/>
