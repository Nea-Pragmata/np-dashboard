<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { Collections, AddonServicesPriceTypeOptions } from '$lib/pocketbase-types';
	import { PRICE_TYPE_OPTIONS, priceTypeLabel } from './pricing';
	import type { AddonRow } from './+page';

	let {
		open = $bindable(false),
		addon = null,
		onsaved
	}: {
		open?: boolean;
		/** The add-on being edited, or `null` to create a new one. */
		addon?: AddonRow | null;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(addon));

	let name = $state('');
	let description = $state('');
	let price = $state<number>(0);
	let priceType = $state<string>(AddonServicesPriceTypeOptions.monthly);
	let published = $state(false);
	let saving = $state(false);

	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = addon?.id ?? 'new';
		if (key === lastKey) return;
		lastKey = key;

		name = addon?.name ?? '';
		description = addon?.description ?? '';
		price = addon?.price ?? 0;
		priceType = addon?.price_type ?? AddonServicesPriceTypeOptions.monthly;
		published = addon?.published === true;
	});

	const typeLabel = $derived(priceTypeLabel(priceType));
	const canSave = $derived(!saving && name.trim().length > 0 && price >= 0);

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = {
				name: name.trim(),
				description: description.trim(),
				price,
				price_type: priceType,
				published
			};
			if (addon) {
				await pb.collection(Collections.AddonServices).update(addon.id, payload);
				toast.success('Tjenesten er oppdatert.');
			} else {
				await pb.collection(Collections.AddonServices).create(payload);
				toast.success('Tjenesten er opprettet.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre tjenesten.');
		} finally {
			saving = false;
		}
	}
</script>

<Drawer bind:open title={editing ? 'Rediger tilleggstjeneste' : 'Ny tilleggstjeneste'}>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1.5">
			<Label for="addon-name">Navn</Label>
			<Input id="addon-name" bind:value={name} placeholder="Tjenestenavn" />
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="addon-desc">Beskrivelse</Label>
			<Textarea id="addon-desc" bind:value={description} rows={2} placeholder="Kort beskrivelse …" />
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="addon-price">Pris</Label>
			<div class="relative">
				<Input
					id="addon-price"
					type="number"
					min="0"
					step="10"
					bind:value={price}
					class="pr-10 tabular-nums"
				/>
				<span
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
				>
					kr
				</span>
			</div>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="addon-type">Type</Label>
			<Select.Root type="single" bind:value={priceType}>
				<Select.Trigger id="addon-type" class="w-full">{typeLabel}</Select.Trigger>
				<Select.Content>
					{#each PRICE_TYPE_OPTIONS as t (t.value)}
						<Select.Item value={t.value} label={t.label}>{t.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<p class="text-sm text-muted-foreground">
				«Per måned» legges til i månedsprisen; «Engangs» faktureres én gang.
			</p>
		</div>

		<div class="border-t border-border pt-5">
			<label for="addon-published" class="flex cursor-pointer items-center gap-3">
				<Switch id="addon-published" bind:checked={published} />
				<span class="min-w-0 flex-1 text-sm font-medium text-foreground">
					Publiser på byråets nettside
				</span>
			</label>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
