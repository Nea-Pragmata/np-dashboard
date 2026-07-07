<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import DynamicForm from '$lib/components/forms/DynamicForm.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import {
		Collections,
		ProductsPriceTypeOptions,
		ProductsStatusOptions,
		type CategoriesResponse,
		type AttributeSchemasResponse
	} from '$lib/pocketbase-types';
	import { industryLabel, slugify } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import type { CatalogProduct } from './+page';

	let {
		open = $bindable(false),
		product = null,
		categories,
		schemas,
		businessId,
		businessType,
		onsaved
	}: {
		open?: boolean;
		/** The product being edited, or `null` to create a new one. */
		product?: CatalogProduct | null;
		categories: CategoriesResponse[];
		/** Catalog attribute schemas (already filtered + sorted) — the dynamic fields. */
		schemas: AttributeSchemasResponse[];
		businessId: string;
		businessType: string;
		/** Called after a successful create/update so the parent can invalidate. */
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(product));

	// --- form working copy ---------------------------------------------------
	let name = $state('');
	let categoryId = $state('');
	let description = $state('');
	let priceType = $state<string>(ProductsPriceTypeOptions.fixed);
	let priceInput = $state<number | undefined>(undefined);
	let priceUnit = $state<string>('none'); // 'none' | stk | time | per_m2
	let visible = $state(true); // status active ↔ hidden
	let bookable = $state(false);
	let featured = $state(false);
	let attributes = $state<Record<string, unknown>>({});
	let saving = $state(false);
	let nameError = $state('');
	let categoryError = $state('');
	let dynamicForm = $state<DynamicForm>();

	// Re-seed the working copy each time the drawer opens (keyed on the product id
	// so it never fights the user's in-progress edits). Reset to '' on close so
	// reopening the same product starts clean.
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = product?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;

		name = product?.name ?? '';
		categoryId = product?.category ?? '';
		description = product?.description ?? '';
		priceType = product?.price_type ?? ProductsPriceTypeOptions.fixed;
		priceInput = product?.price ?? undefined;
		priceUnit = product?.price_unit || 'none';
		visible = product ? product.status === ProductsStatusOptions.active : true;
		bookable = product?.bookable ?? false;
		featured = product?.featured ?? false;
		attributes = { ...(product?.attributes ?? {}) };
		nameError = '';
		categoryError = '';
		dynamicForm?.reset();
	});

	const selectedCategory = $derived(categories.find((c) => c.id === categoryId));

	const PRICE_TYPES = [
		{ value: ProductsPriceTypeOptions.fixed, label: 'Fast pris' },
		{ value: ProductsPriceTypeOptions.from, label: 'Fra-pris' },
		{ value: ProductsPriceTypeOptions.on_request, label: 'På forespørsel' }
	];
	const priceTypeLabel = $derived(
		PRICE_TYPES.find((t) => t.value === priceType)?.label ?? 'Velg …'
	);

	const PRICE_UNITS = [
		{ value: 'none', label: 'Ingen enhet' },
		{ value: 'stk', label: 'Per stk' },
		{ value: 'time', label: 'Per time' },
		{ value: 'per_m2', label: 'Per m²' }
	];
	const priceUnitLabel = $derived(
		PRICE_UNITS.find((u) => u.value === priceUnit)?.label ?? 'Ingen enhet'
	);

	const showPrice = $derived(priceType !== ProductsPriceTypeOptions.on_request);

	async function save() {
		nameError = name.trim() ? '' : 'Navn må fylles ut.';
		categoryError = categoryId ? '' : 'Velg en kategori.';
		const dynOk = dynamicForm ? dynamicForm.validate() : true;
		if (nameError || categoryError || !dynOk) return;

		saving = true;
		// The visibility switch toggles active ↔ hidden. A pre-existing "sold"
		// product keeps that state unless it's explicitly made visible again.
		const status = visible
			? ProductsStatusOptions.active
			: product?.status === ProductsStatusOptions.sold
				? ProductsStatusOptions.sold
				: ProductsStatusOptions.hidden;

		const payload = {
			category: categoryId,
			name: name.trim(),
			description,
			price_type: priceType,
			price: showPrice ? Number(priceInput) || 0 : 0,
			price_unit: showPrice && priceUnit !== 'none' ? priceUnit : '',
			status,
			bookable,
			featured,
			attributes
		};

		try {
			if (product) {
				// Customer update: never send `business` (API rule requires
				// @request.body.business:isset = false). Slug stays put.
				await pb.collection(Collections.Products).update(product.id, payload);
				toast.success('Produktet er lagret.');
			} else {
				const slug = slugify(name) || `produkt-${Date.now().toString(36)}`;
				await pb.collection(Collections.Products).create({
					...payload,
					business: businessId,
					slug
				});
				toast.success('Produktet er lagt til.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	const sectionLabel =
		'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer
	bind:open
	title={editing ? 'Rediger produkt' : 'Nytt produkt'}
	description="Slik vises produktet eller tjenesten på nettsiden din."
>
	<div class="flex flex-col gap-5">
		<!-- Navn -->
		<Field.Field data-invalid={nameError ? 'true' : undefined}>
			<Field.Label for="p-name">Navn<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="p-name"
				bind:value={name}
				placeholder="F.eks. Herreklipp"
				aria-invalid={Boolean(nameError)}
				oninput={() => (nameError = '')}
			/>
			{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
		</Field.Field>

		<!-- Kategori -->
		<Field.Field data-invalid={categoryError ? 'true' : undefined}>
			<Field.Label for="p-category">Kategori<span class="text-destructive"> *</span></Field.Label>
			<Select.Root
				type="single"
				bind:value={categoryId}
				onValueChange={() => (categoryError = '')}
			>
				<Select.Trigger id="p-category" class="w-full" aria-invalid={Boolean(categoryError)}>
					<span class={cn(!selectedCategory && 'text-muted-foreground')}>
						{selectedCategory?.name ?? 'Velg kategori …'}
					</span>
				</Select.Trigger>
				<Select.Content>
					{#each categories as c (c.id)}
						<Select.Item value={c.id} label={c.name}>{c.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			{#if categoryError}<Field.Error>{categoryError}</Field.Error>{/if}
		</Field.Field>

		<!-- Beskrivelse -->
		<Field.Field>
			<Field.Label for="p-description">Beskrivelse</Field.Label>
			<Textarea
				id="p-description"
				bind:value={description}
				rows={3}
				placeholder="Kort beskrivelse kundene ser på nettsiden."
			/>
		</Field.Field>

		<!-- Bransjefelter (dynamiske felter fra attribute_schemas) -->
		{#if schemas.length > 0}
			<div class="flex flex-col gap-3">
				<p class={sectionLabel}>Bransjefelter · {industryLabel(businessType)}</p>
				<DynamicForm bind:this={dynamicForm} {schemas} bind:values={attributes} />
			</div>
		{/if}

		<!-- Pris -->
		<div class="flex flex-col gap-4">
			<p class={sectionLabel}>Pris</p>
			<Field.Field>
				<Field.Label for="p-price-type">Pris-type</Field.Label>
				<Select.Root type="single" bind:value={priceType}>
					<Select.Trigger id="p-price-type" class="w-full">{priceTypeLabel}</Select.Trigger>
					<Select.Content>
						{#each PRICE_TYPES as t (t.value)}
							<Select.Item value={t.value} label={t.label}>{t.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</Field.Field>

			{#if showPrice}
				<Field.Field>
					<Field.Label for="p-price">Pris</Field.Label>
					<div class="relative">
						<Input id="p-price" type="number" min="0" step="1" bind:value={priceInput} class="pr-10" />
						<span
							class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
						>
							kr
						</span>
					</div>
				</Field.Field>

				<Field.Field>
					<Field.Label for="p-price-unit">Prisenhet</Field.Label>
					<Select.Root type="single" bind:value={priceUnit}>
						<Select.Trigger id="p-price-unit" class="w-full">{priceUnitLabel}</Select.Trigger>
						<Select.Content>
							{#each PRICE_UNITS as u (u.value)}
								<Select.Item value={u.value} label={u.label}>{u.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
			{/if}
		</div>

		<!-- Synlighet + flagg -->
		<div class="flex flex-col gap-4 border-t border-border pt-4">
			<div class="flex items-center gap-3">
				<Switch id="p-visible" checked={visible} onCheckedChange={(c) => (visible = c)} />
				<label for="p-visible" class="text-sm text-text-body">Synlig i katalogen</label>
			</div>
			<div class="flex items-center gap-3">
				<Switch id="p-bookable" checked={bookable} onCheckedChange={(c) => (bookable = c)} />
				<label for="p-bookable" class="text-sm text-text-body">Kan bookes</label>
			</div>
			<div class="flex items-center gap-3">
				<Switch id="p-featured" checked={featured} onCheckedChange={(c) => (featured = c)} />
				<label for="p-featured" class="text-sm text-text-body">Fremhev på nettsiden</label>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Legg til'}
		</Button>
	{/snippet}
</Drawer>
