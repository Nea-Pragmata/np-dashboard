<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Package from '@lucide/svelte/icons/package';
	import Search from '@lucide/svelte/icons/search';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import ProductDrawer from './ProductDrawer.svelte';
	import CategoryDrawer from './CategoryDrawer.svelte';
	import { formatCatalogPrice, slugify } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { pb } from '$lib/pb';
	import {
		Collections,
		ProductsStatusOptions,
		type CategoriesResponse
	} from '$lib/pocketbase-types';
	import type { TableState } from '$lib/types';
	import { cn } from '$lib/utils.js';
	import type { PageData } from './$types';
	import type { CatalogProduct } from './+page';

	let { data }: { data: PageData } = $props();

	const products = $derived(data.products);
	const categories = $derived(data.categories);
	const schemas = $derived(data.schemas);
	const businessId = $derived(data.business?.id ?? '');
	const businessType = $derived(data.business?.type ?? 'annet');

	// --- tabs ----------------------------------------------------------------
	type Tab = 'produkter' | 'kategorier';
	let activeTab = $state<Tab>('produkter');
	const TABS: { value: Tab; label: string }[] = [
		{ value: 'produkter', label: 'Produkter & tjenester' },
		{ value: 'kategorier', label: 'Kategorier' }
	];

	// --- filters -------------------------------------------------------------
	let q = $state('');
	let categoryFilter = $state('all');
	let statusFilter = $state('all');

	const STATUS_FILTERS = [
		{ value: 'all', label: 'Alle' },
		{ value: ProductsStatusOptions.active, label: 'Aktiv' },
		{ value: ProductsStatusOptions.hidden, label: 'Skjult' },
		{ value: ProductsStatusOptions.sold, label: 'Solgt' }
	];
	const categoryFilterLabel = $derived(
		categoryFilter === 'all'
			? 'Alle'
			: (categories.find((c) => c.id === categoryFilter)?.name ?? 'Alle')
	);
	const statusFilterLabel = $derived(
		STATUS_FILTERS.find((s) => s.value === statusFilter)?.label ?? 'Alle'
	);

	const filteredProducts = $derived(
		products.filter((p) => {
			if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
			if (statusFilter !== 'all' && p.status !== statusFilter) return false;
			const query = q.trim().toLowerCase();
			if (query && !p.name.toLowerCase().includes(query)) return false;
			return true;
		})
	);

	// Product count per category (for the Kategorier tab labels).
	const countByCategory = $derived.by(() => {
		const map = new Map<string, number>();
		for (const p of products) map.set(p.category, (map.get(p.category) ?? 0) + 1);
		return map;
	});

	const nextSortOrder = $derived(
		categories.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1
	);

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/katalog'
	);
	const tableState = $derived<TableState<CatalogProduct>>({
		status: isLoading ? 'loading' : 'ready',
		items: filteredProducts
	});

	function refresh() {
		return invalidateAll();
	}

	// --- product actions -----------------------------------------------------
	let productDrawerOpen = $state(false);
	let editingProduct = $state<CatalogProduct | null>(null);

	function openNewProduct() {
		editingProduct = null;
		productDrawerOpen = true;
	}
	function editProduct(p: CatalogProduct) {
		editingProduct = p;
		productDrawerOpen = true;
	}

	async function duplicateProduct(p: CatalogProduct) {
		try {
			await pb.collection(Collections.Products).create({
				business: businessId,
				category: p.category,
				name: `${p.name} (kopi)`,
				slug: slugify(`${p.name}-kopi-${Date.now().toString(36)}`),
				description: p.description,
				price: p.price,
				price_type: p.price_type,
				price_unit: p.price_unit,
				// A duplicate starts hidden so it's reviewed before going live.
				status: ProductsStatusOptions.hidden,
				bookable: p.bookable,
				featured: false,
				attributes: p.attributes,
				sort_order: p.sort_order
			});
			toast.success('Produktet er duplisert.');
			await refresh();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	let deleteProductOpen = $state(false);
	let deleteProductTarget = $state<CatalogProduct | null>(null);
	function askDeleteProduct(p: CatalogProduct) {
		deleteProductTarget = p;
		deleteProductOpen = true;
	}
	async function confirmDeleteProduct() {
		const p = deleteProductTarget;
		if (!p) return;
		try {
			await pb.collection(Collections.Products).delete(p.id);
			toast.success('Produktet er slettet.');
			await refresh();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	// --- category actions ----------------------------------------------------
	let categoryDrawerOpen = $state(false);
	let editingCategory = $state<CategoriesResponse | null>(null);

	function openNewCategory() {
		editingCategory = null;
		categoryDrawerOpen = true;
	}
	function editCategory(c: CategoriesResponse) {
		editingCategory = c;
		categoryDrawerOpen = true;
	}

	let deleteCategoryOpen = $state(false);
	let deleteCategoryTarget = $state<CategoriesResponse | null>(null);
	function askDeleteCategory(c: CategoriesResponse) {
		// A category with products can't be deleted — products.category is required.
		if ((countByCategory.get(c.id) ?? 0) > 0) {
			toast.error('Kategorien har produkter. Flytt dem til en annen kategori først.');
			return;
		}
		deleteCategoryTarget = c;
		deleteCategoryOpen = true;
	}
	async function confirmDeleteCategory() {
		const c = deleteCategoryTarget;
		if (!c) return;
		try {
			await pb.collection(Collections.Categories).delete(c.id);
			toast.success('Kategorien er slettet.');
			await refresh();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Katalog · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Katalog</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Produktene og tjenestene kundene dine ser på nettsiden.
			</p>
		</div>
		{#if activeTab === 'produkter'}
			<Button variant={products.length > 0 ? 'default' : 'outline'} onclick={openNewProduct}>
				<Plus class="size-4" />
				Nytt produkt
			</Button>
		{:else}
			<Button variant={categories.length > 0 ? 'default' : 'outline'} onclick={openNewCategory}>
				<Plus class="size-4" />
				Ny kategori
			</Button>
		{/if}
	</header>

	<!-- Faner -->
	<div class="flex gap-6 border-b border-border" role="tablist" aria-label="Katalog">
		{#each TABS as t (t.value)}
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === t.value}
				onclick={() => (activeTab = t.value)}
				class={cn(
					'relative -mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
					activeTab === t.value
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}
			>
				{t.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'produkter'}
		<!-- Filtre -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="relative sm:max-w-xs sm:flex-1">
				<Search
					class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
				/>
				<Input
					name="katalog-sok"
					type="search"
					aria-label="Søk i katalogen"
					placeholder="Søk i katalogen …"
					bind:value={q}
					class="pl-9"
				/>
			</div>
			<Select.Root type="single" bind:value={categoryFilter}>
				<Select.Trigger class="sm:w-[190px]">Kategori: {categoryFilterLabel}</Select.Trigger>
				<Select.Content>
					<Select.Item value="all" label="Alle">Alle</Select.Item>
					{#each categories as c (c.id)}
						<Select.Item value={c.id} label={c.name}>{c.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<Select.Root type="single" bind:value={statusFilter}>
				<Select.Trigger class="sm:w-[170px]">Status: {statusFilterLabel}</Select.Trigger>
				<Select.Content>
					{#each STATUS_FILTERS as s (s.value)}
						<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Produkttabell -->
		<DataTable
			state={tableState}
			columns={6}
			onRetry={refresh}
			empty={products.length === 0
				? {
						icon: Package,
						title: 'Ingen produkter ennå',
						description:
							'Legg inn det første produktet, så vises det på nettsiden din med en gang.',
						action: newProductCta
					}
				: {
						icon: Search,
						title: 'Ingen treff',
						description: 'Prøv et annet søk eller filter.'
					}}
		>
			{#snippet header()}
				<th class="w-[52px]"><span class="sr-only">Bilde</span></th>
				<th>Navn</th>
				<th>Kategori</th>
				<th><div class="text-right">Pris</div></th>
				<th>Status</th>
				<th class="w-[52px]"><span class="sr-only">Handlinger</span></th>
			{/snippet}
			{#snippet row(p)}
				<td>
					<span
						class="flex size-9 items-center justify-center rounded-md bg-muted text-text-subtle"
						aria-hidden="true"
					>
						<ImageIcon class="size-4" />
					</span>
				</td>
				<td class="font-medium text-foreground">{p.name}</td>
				<td class="text-muted-foreground">{p.expand?.category?.name ?? '—'}</td>
				<td class="text-right tabular-nums text-foreground">
					{formatCatalogPrice(p.price_type, p.price, p.price_unit)}
				</td>
				<td><StatusBadge collection="products" status={p.status} /></td>
				<td>
					<div class="flex justify-end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {p.name}">
								<Ellipsis class="size-4" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Item onSelect={() => editProduct(p)}>Rediger</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={() => duplicateProduct(p)}>Dupliser</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									class="text-destructive data-highlighted:text-destructive"
									onSelect={() => askDeleteProduct(p)}
								>
									Slett
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</td>
			{/snippet}
		</DataTable>
	{:else}
		<!-- Kategoriliste -->
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			{#if categories.length === 0}
				<EmptyState
					icon={FolderOpen}
					title="Ingen kategorier ennå"
					description="Lag din første kategori for å gruppere produkter og tjenester."
					action={newCategoryCta}
					class="py-12"
				/>
			{:else}
				<ul>
					{#each categories as c (c.id)}
						{@const count = countByCategory.get(c.id) ?? 0}
						<li
							class="flex items-center gap-3 border-b border-border px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted"
						>
							<GripVertical
								class="size-4 shrink-0 cursor-grab text-text-subtle"
								aria-hidden="true"
							/>
							<span class="font-medium text-foreground">{c.name}</span>
							<span class="text-sm text-muted-foreground">
								{count}
								{count === 1 ? 'produkt' : 'produkter'}
							</span>
							<div class="ml-auto">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {c.name}">
										<Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onSelect={() => editCategory(c)}>Rediger</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive data-highlighted:text-destructive"
											onSelect={() => askDeleteCategory(c)}
										>
											Slett
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<!-- Empty-state CTA-er (svart primærknapp midt i tom tilstand) -->
{#snippet newProductCta()}
	<Button onclick={openNewProduct}>
		<Plus class="size-4" />
		Nytt produkt
	</Button>
{/snippet}
{#snippet newCategoryCta()}
	<Button onclick={openNewCategory}>
		<Plus class="size-4" />
		Ny kategori
	</Button>
{/snippet}

<!-- Skuffer + bekreftelser -->
<ProductDrawer
	bind:open={productDrawerOpen}
	product={editingProduct}
	{categories}
	{schemas}
	{businessId}
	{businessType}
	onsaved={refresh}
/>
<CategoryDrawer
	bind:open={categoryDrawerOpen}
	category={editingCategory}
	{businessId}
	{nextSortOrder}
	onsaved={refresh}
/>
<ConfirmDialog
	bind:open={deleteProductOpen}
	title="Slette produktet?"
	description={deleteProductTarget
		? `«${deleteProductTarget.name}» fjernes fra katalogen og nettsiden. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Slett"
	cancelLabel="Avbryt"
	destructive
	onconfirm={confirmDeleteProduct}
/>
<ConfirmDialog
	bind:open={deleteCategoryOpen}
	title="Slette kategorien?"
	description={deleteCategoryTarget
		? `«${deleteCategoryTarget.name}» slettes. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Slett"
	cancelLabel="Avbryt"
	destructive
	onconfirm={confirmDeleteCategory}
/>
