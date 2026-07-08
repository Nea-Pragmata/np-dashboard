<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Package from '@lucide/svelte/icons/package';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import PackageDrawer from './PackageDrawer.svelte';
	import AddonDrawer from './AddonDrawer.svelte';
	import CampaignDrawer from './CampaignDrawer.svelte';
	import SubscriptionDrawer from './SubscriptionDrawer.svelte';
	import { pb } from '$lib/pb';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import { formatKr } from '$lib/utils/format';
	import { Collections } from '$lib/pocketbase-types';
	import {
		priceTypeLabel,
		discountLabel,
		campaignPeriodLabel,
		campaignStatusMeta,
		computeMonthly,
		computeRecurring,
		intervalSuffix,
		TONE_BADGE,
		type PricedAddon
	} from './pricing';
	import type { TableState } from '$lib/types';
	import type { PageData } from './$types';
	import type { PackageRow, AddonRow, CampaignRow, SubRow } from './+page';

	let { data }: { data: PageData } = $props();

	const isOwner = $derived(auth.agencyMember?.role === 'owner');
	const showActions = $derived(isOwner);

	// Local copies of the two toggle-bearing lists so an inline «på nettsiden»
	// toggle-off doesn't make the row vanish (the API lists published-only). The
	// lists re-seed from `data` after every invalidate.
	let localPackages = $state<PackageRow[]>([]);
	let localAddons = $state<AddonRow[]>([]);
	$effect(() => {
		localPackages = [...data.packages];
	});
	$effect(() => {
		localAddons = [...data.addons];
	});

	// --- derived lookups -----------------------------------------------------
	const packagesById = $derived(new Map(data.packages.map((p) => [p.id, p])));
	const addonsById = $derived(new Map(data.addons.map((a) => [a.id, a])));
	const campaignsById = $derived(new Map(data.campaigns.map((c) => [c.id, c])));

	const subCountByPackage = $derived.by(() => {
		const map = new Map<string, number>();
		for (const s of data.subscriptions) map.set(s.package, (map.get(s.package) ?? 0) + 1);
		return map;
	});

	const availableBusinesses = $derived.by(() => {
		const taken = new Set(data.subscriptions.map((s) => s.business));
		return data.businesses.filter((b) => !taken.has(b.id));
	});

	function subRecurring(s: SubRow): { amount: number | null; interval: string } {
		const pkg = packagesById.get(s.package);
		const pkgPrice = pkg ? pkg.price_per_month : null;
		const chosen: PricedAddon[] = (s.addons ?? [])
			.map((id) => addonsById.get(id))
			.filter((a): a is AddonRow => Boolean(a))
			.map((a) => ({ price: a.price, price_type: a.price_type }));
		const camp = s.campaign ? campaignsById.get(s.campaign) : undefined;
		const discount = camp
			? { discount_type: camp.discount_type, discount_value: camp.discount_value }
			: null;
		const monthlyBase = computeMonthly(pkgPrice, chosen, discount, null);
		return { amount: computeRecurring(monthlyBase, s.billing_interval, s.price_override), interval: s.billing_interval };
	}
	function subPackageName(s: SubRow): string {
		return s.expand?.package?.name ?? packagesById.get(s.package)?.name ?? 'Upublisert pakke';
	}

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/np-admin/pakker-priser'
	);
	function tableState<T>(items: T[]): TableState<T> {
		return { status: isLoading ? 'loading' : 'ready', items };
	}
	const packageState = $derived(tableState(localPackages));
	const addonState = $derived(tableState(localAddons));
	const campaignState = $derived(tableState(data.campaigns));
	const subscriptionState = $derived(tableState(data.subscriptions));

	function refresh() {
		return invalidateAll();
	}

	// --- inline publish toggles (optimistic, no invalidate) ------------------
	async function togglePackage(p: PackageRow) {
		const next = !p.published;
		localPackages = localPackages.map((x) => (x.id === p.id ? { ...x, published: next } : x));
		try {
			await pb.collection(Collections.Packages).update(p.id, { published: next });
			toast.success(next ? 'Pakken vises på nettsiden.' : 'Pakken er skjult fra nettsiden.');
		} catch (e) {
			localPackages = localPackages.map((x) => (x.id === p.id ? { ...x, published: !next } : x));
			toast.error(pbError(e) || 'Kunne ikke endre synligheten.');
		}
	}
	async function toggleAddon(a: AddonRow) {
		const next = !a.published;
		localAddons = localAddons.map((x) => (x.id === a.id ? { ...x, published: next } : x));
		try {
			await pb.collection(Collections.AddonServices).update(a.id, { published: next });
			toast.success(next ? 'Tjenesten vises på nettsiden.' : 'Tjenesten er skjult fra nettsiden.');
		} catch (e) {
			localAddons = localAddons.map((x) => (x.id === a.id ? { ...x, published: !next } : x));
			toast.error(pbError(e) || 'Kunne ikke endre synligheten.');
		}
	}

	// --- drawers -------------------------------------------------------------
	let pkgOpen = $state(false);
	let editingPkg = $state<PackageRow | null>(null);
	let addonOpen = $state(false);
	let editingAddon = $state<AddonRow | null>(null);
	let campOpen = $state(false);
	let editingCamp = $state<CampaignRow | null>(null);
	let subOpen = $state(false);
	let editingSub = $state<SubRow | null>(null);

	// --- delete (shared confirm) ---------------------------------------------
	let confirmOpen = $state(false);
	let pending = $state<{ collection: string; id: string; title: string; description: string } | null>(
		null
	);
	function askDelete(collection: string, id: string, title: string, description: string) {
		pending = { collection, id, title, description };
		confirmOpen = true;
	}
	async function doDelete() {
		if (!pending) return;
		try {
			await pb.collection(pending.collection).delete(pending.id);
			toast.success('Slettet.');
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke slette.');
		}
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
	const neutralBadge =
		'inline-flex h-[22px] items-center rounded-full bg-muted px-2 text-xs font-medium text-text-body';
</script>

<svelte:head><title>Pakker &amp; priser · NP Admin</title></svelte:head>

<div class="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Pakker &amp; priser</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Prisene og kampanjene som vises på byråets nettside.
			</p>
		</div>
		{#if isOwner}
			<Button onclick={() => { editingPkg = null; pkgOpen = true; }}>
				<Plus class="size-4" />
				Ny pakke
			</Button>
		{/if}
	</header>

	<!-- PAKKER -->
	<section class="flex flex-col gap-3">
		<h2 class={sectionLabel}>Pakker</h2>
		<DataTable
			state={packageState}
			columns={showActions ? 5 : 4}
			onRetry={refresh}
			empty={{ icon: Package, title: 'Ingen pakker ennå', description: 'Lag den første pakken kundene kan velge.' }}
		>
			{#snippet header()}
				<th>Pakke</th>
				<th class="w-[170px] text-right">Pris per måned</th>
				<th class="w-[110px] text-right">Bedrifter</th>
				<th class="w-[140px]">På nettsiden</th>
				{#if showActions}<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>{/if}
			{/snippet}
			{#snippet row(p)}
				<td>
					<div class="flex flex-col">
						<span class="text-sm font-medium text-foreground">{p.name}</span>
						{#if p.description}
							<span class="line-clamp-1 text-xs text-muted-foreground">
								{p.description.replace(/<[^>]*>/g, '')}
							</span>
						{/if}
					</div>
				</td>
				<td class="text-right tabular-nums text-text-body">{formatKr(p.price_per_month)}</td>
				<td class="text-right tabular-nums text-text-body">{subCountByPackage.get(p.id) ?? 0}</td>
				<td>
					<Switch
						checked={p.published === true}
						disabled={!isOwner}
						onCheckedChange={() => togglePackage(p)}
						aria-label="Vis {p.name} på nettsiden"
					/>
				</td>
				{#if showActions}
					<td>
						<div class="flex justify-end">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {p.name}">
									<Ellipsis class="size-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => { editingPkg = p; pkgOpen = true; }}>
										Rediger
									</DropdownMenu.Item>
									<DropdownMenu.Item
										variant="destructive"
										onSelect={() =>
											askDelete(Collections.Packages, p.id, 'Slette pakken?', `«${p.name}» slettes for godt.`)}
									>
										Slett
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					</td>
				{/if}
			{/snippet}
		</DataTable>
	</section>

	<!-- TILLEGGSTJENESTER -->
	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-2">
			<h2 class={sectionLabel}>Tilleggstjenester</h2>
			{#if isOwner}
				<Button variant="ghost" size="sm" onclick={() => { editingAddon = null; addonOpen = true; }}>
					<Plus class="size-4" />
					Ny tjeneste
				</Button>
			{/if}
		</div>
		<DataTable
			state={addonState}
			columns={showActions ? 5 : 4}
			onRetry={refresh}
			empty={{ icon: Puzzle, title: 'Ingen tilleggstjenester ennå', description: 'Legg til tjenester kundene kan kjøpe i tillegg til pakken.' }}
		>
			{#snippet header()}
				<th>Tjeneste</th>
				<th class="w-[150px] text-right">Pris</th>
				<th class="w-[130px]">Type</th>
				<th class="w-[140px]">På nettsiden</th>
				{#if showActions}<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>{/if}
			{/snippet}
			{#snippet row(a)}
				<td>
					<div class="flex flex-col">
						<span class="text-sm font-medium text-foreground">{a.name}</span>
						{#if a.description}
							<span class="line-clamp-1 text-xs text-muted-foreground">{a.description}</span>
						{/if}
					</div>
				</td>
				<td class="text-right tabular-nums text-text-body">{formatKr(a.price)}</td>
				<td><span class={neutralBadge}>{priceTypeLabel(a.price_type)}</span></td>
				<td>
					<Switch
						checked={a.published === true}
						disabled={!isOwner}
						onCheckedChange={() => toggleAddon(a)}
						aria-label="Vis {a.name} på nettsiden"
					/>
				</td>
				{#if showActions}
					<td>
						<div class="flex justify-end">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {a.name}">
									<Ellipsis class="size-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => { editingAddon = a; addonOpen = true; }}>
										Rediger
									</DropdownMenu.Item>
									<DropdownMenu.Item
										variant="destructive"
										onSelect={() =>
											askDelete(Collections.AddonServices, a.id, 'Slette tjenesten?', `«${a.name}» slettes for godt.`)}
									>
										Slett
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					</td>
				{/if}
			{/snippet}
		</DataTable>
	</section>

	<!-- KAMPANJER -->
	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-2">
			<h2 class={sectionLabel}>Kampanjer på nettsiden</h2>
			{#if isOwner}
				<Button variant="ghost" size="sm" onclick={() => { editingCamp = null; campOpen = true; }}>
					<Plus class="size-4" />
					Ny kampanje
				</Button>
			{/if}
		</div>
		<DataTable
			state={campaignState}
			columns={showActions ? 5 : 4}
			onRetry={refresh}
			empty={{ icon: Megaphone, title: 'Ingen kampanjer ennå', description: 'Lag en kampanje for å tilby rabatt på nettsiden.' }}
		>
			{#snippet header()}
				<th>Kampanje</th>
				<th class="w-[140px]">Rabatt</th>
				<th class="w-[200px]">Periode</th>
				<th class="w-[120px]">Status</th>
				{#if showActions}<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>{/if}
			{/snippet}
			{#snippet row(c)}
				{@const meta = campaignStatusMeta(c.valid_from, c.valid_to)}
				<td>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-foreground">{c.name}</span>
						{#if !c.published}
							<span class={neutralBadge}>Skjult</span>
						{/if}
					</div>
				</td>
				<td class="tabular-nums text-text-body">{discountLabel(c.discount_type, c.discount_value)}</td>
				<td class="text-text-body">{campaignPeriodLabel(c.valid_from, c.valid_to)}</td>
				<td>
					<Badge
						class={cn('h-[22px] gap-1.5 rounded-full border-transparent px-2 text-xs font-medium', TONE_BADGE[meta.tone])}
					>
						<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"></span>
						{meta.label}
					</Badge>
				</td>
				{#if showActions}
					<td>
						<div class="flex justify-end">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {c.name}">
									<Ellipsis class="size-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => { editingCamp = c; campOpen = true; }}>
										Rediger
									</DropdownMenu.Item>
									<DropdownMenu.Item
										variant="destructive"
										onSelect={() =>
											askDelete(Collections.AgencyCampaigns, c.id, 'Slette kampanjen?', `«${c.name}» slettes for godt.`)}
									>
										Slett
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					</td>
				{/if}
			{/snippet}
		</DataTable>
	</section>

	<!-- ABONNEMENTER -->
	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-2">
			<h2 class={sectionLabel}>Abonnementer</h2>
			{#if isOwner && availableBusinesses.length > 0}
				<Button variant="ghost" size="sm" onclick={() => { editingSub = null; subOpen = true; }}>
					<Plus class="size-4" />
					Nytt abonnement
				</Button>
			{/if}
		</div>
		<DataTable
			state={subscriptionState}
			columns={showActions ? 5 : 4}
			onRetry={refresh}
			empty={{ icon: Building2, title: 'Ingen abonnementer ennå', description: 'Knytt bedrifter til pakker for å se dem her.' }}
		>
			{#snippet header()}
				<th>Bedrift</th>
				<th class="w-[200px]">Pakke</th>
				<th class="w-[160px] text-right">Driftspris</th>
				<th class="w-[120px]">Status</th>
				{#if showActions}<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>{/if}
			{/snippet}
			{#snippet row(s)}
				{@const rec = subRecurring(s)}
				<td class="text-sm font-medium text-foreground">{s.expand?.business?.name ?? 'Ukjent bedrift'}</td>
				<td class="text-text-body">{subPackageName(s)}</td>
				<td class="text-right tabular-nums text-text-body">
					{rec.amount == null ? '—' : `${formatKr(rec.amount)}${intervalSuffix(rec.interval)}`}
				</td>
				<td><StatusBadge collection="subscriptions" status={s.status} /></td>
				{#if showActions}
					<td>
						<div class="flex justify-end">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger
									class={triggerClass}
									aria-label="Handlinger for {s.expand?.business?.name ?? 'abonnement'}"
								>
									<Ellipsis class="size-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => { editingSub = s; subOpen = true; }}>
										Rediger
									</DropdownMenu.Item>
									<DropdownMenu.Item
										variant="destructive"
										onSelect={() =>
											askDelete(
												Collections.Subscriptions,
												s.id,
												'Slette abonnementet?',
												`Abonnementet for «${s.expand?.business?.name ?? 'bedriften'}» slettes.`
											)}
									>
										Slett
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					</td>
				{/if}
			{/snippet}
		</DataTable>
	</section>

	<p class="text-xs text-muted-foreground">
		Publiserte priser og kampanjer vises automatisk på byråets nettside.
	</p>
</div>

<PackageDrawer bind:open={pkgOpen} pkg={editingPkg} onsaved={refresh} />
<AddonDrawer bind:open={addonOpen} addon={editingAddon} onsaved={refresh} />
<CampaignDrawer bind:open={campOpen} campaign={editingCamp} packages={data.packages} onsaved={refresh} />
<SubscriptionDrawer
	bind:open={subOpen}
	subscription={editingSub}
	packages={data.packages}
	addons={data.addons}
	campaigns={data.campaigns}
	{availableBusinesses}
	onsaved={refresh}
/>

<ConfirmDialog
	bind:open={confirmOpen}
	title={pending?.title ?? 'Slette?'}
	description={pending?.description}
	confirmLabel="Slett"
	destructive
	onconfirm={doDelete}
/>
