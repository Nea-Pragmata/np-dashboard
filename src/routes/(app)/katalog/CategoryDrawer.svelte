<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections, type CategoriesResponse } from '$lib/pocketbase-types';
	import { slugify } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';

	let {
		open = $bindable(false),
		category = null,
		businessId,
		nextSortOrder = 0,
		onsaved
	}: {
		open?: boolean;
		/** The category being edited, or `null` to create a new one. */
		category?: CategoriesResponse | null;
		businessId: string;
		/** sort_order to assign a newly created category (max existing + 1). */
		nextSortOrder?: number;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(category));

	let name = $state('');
	let saving = $state(false);
	let nameError = $state('');

	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = category?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;
		name = category?.name ?? '';
		nameError = '';
	});

	async function save() {
		nameError = name.trim() ? '' : 'Navn må fylles ut.';
		if (nameError) return;

		saving = true;
		try {
			if (category) {
				// Customer update: never send `business` (API rule). Slug stays put.
				await pb.collection(Collections.Categories).update(category.id, { name: name.trim() });
				toast.success('Kategorien er lagret.');
			} else {
				const slug = slugify(name) || `kategori-${Date.now().toString(36)}`;
				await pb.collection(Collections.Categories).create({
					business: businessId,
					name: name.trim(),
					slug,
					sort_order: nextSortOrder
				});
				toast.success('Kategorien er lagt til.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title={editing ? 'Rediger kategori' : 'Ny kategori'}
	description="Kategorier grupperer produktene og tjenestene dine."
>
	<Field.Field data-invalid={nameError ? 'true' : undefined}>
		<Field.Label for="c-name">Navn<span class="text-destructive"> *</span></Field.Label>
		<Input
			id="c-name"
			bind:value={name}
			placeholder="F.eks. Herreklipp"
			aria-invalid={Boolean(nameError)}
			oninput={() => (nameError = '')}
		/>
		{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
	</Field.Field>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Legg til'}
		</Button>
	{/snippet}
</Drawer>
