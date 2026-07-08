<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { Collections, AgencyCampaignsDiscountTypeOptions } from '$lib/pocketbase-types';
	import { DISCOUNT_TYPE_OPTIONS } from './pricing';
	import type { CampaignRow, PackageRow } from './+page';

	let {
		open = $bindable(false),
		campaign = null,
		packages = [],
		onsaved
	}: {
		open?: boolean;
		/** The campaign being edited, or `null` to create a new one. */
		campaign?: CampaignRow | null;
		packages?: PackageRow[];
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(campaign));

	let name = $state('');
	let description = $state('');
	let discountType = $state<string>(AgencyCampaignsDiscountTypeOptions.percent);
	let discountValue = $state<number>(0);
	let packageIds = $state<string[]>([]);
	let validFrom = $state('');
	let validTo = $state('');
	let published = $state(false);
	let saving = $state(false);

	/** «2026-06-01 00:00:00.000Z» / ISO → «2026-06-01» for a date input. */
	function toDateInput(iso?: string): string {
		if (!iso) return '';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		return d.toISOString().slice(0, 10);
	}

	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = campaign?.id ?? 'new';
		if (key === lastKey) return;
		lastKey = key;

		name = campaign?.name ?? '';
		description = campaign?.description ?? '';
		discountType = campaign?.discount_type ?? AgencyCampaignsDiscountTypeOptions.percent;
		discountValue = campaign?.discount_value ?? 0;
		packageIds = campaign ? [...(campaign.packages ?? [])] : [];
		validFrom = toDateInput(campaign?.valid_from);
		validTo = toDateInput(campaign?.valid_to);
		published = campaign?.published === true;
	});

	const isPercent = $derived(discountType === AgencyCampaignsDiscountTypeOptions.percent);
	const typeLabel = $derived(
		DISCOUNT_TYPE_OPTIONS.find((t) => t.value === discountType)?.label ?? 'Prosent (%)'
	);

	function togglePkg(id: string, on: boolean) {
		packageIds = on ? [...packageIds, id] : packageIds.filter((x) => x !== id);
	}

	const datesOk = $derived(Boolean(validFrom && validTo && validFrom <= validTo));
	const canSave = $derived(
		!saving && name.trim().length > 0 && discountValue > 0 && datesOk
	);

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = {
				name: name.trim(),
				description: description.trim(),
				discount_type: discountType,
				discount_value: discountValue,
				packages: packageIds,
				valid_from: new Date(validFrom).toISOString(),
				valid_to: new Date(validTo).toISOString(),
				published
			};
			if (campaign) {
				await pb.collection(Collections.AgencyCampaigns).update(campaign.id, payload);
				toast.success('Kampanjen er oppdatert.');
			} else {
				await pb.collection(Collections.AgencyCampaigns).create(payload);
				toast.success('Kampanjen er opprettet.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre kampanjen.');
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer bind:open title={editing ? 'Rediger kampanje' : 'Ny kampanje'}>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1.5">
			<Label for="camp-name">Navn</Label>
			<Input id="camp-name" bind:value={name} placeholder="Kampanjenavn" />
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="camp-desc">Beskrivelse</Label>
			<Textarea id="camp-desc" bind:value={description} rows={2} placeholder="Kort beskrivelse …" />
		</div>

		<!-- Rabatt -->
		<div class="flex flex-col gap-4 border-t border-border pt-5">
			<p class={sectionLabel}>Rabatt</p>
			<div class="flex flex-col gap-1.5">
				<Label for="camp-type">Rabattype</Label>
				<Select.Root type="single" bind:value={discountType}>
					<Select.Trigger id="camp-type" class="w-full">{typeLabel}</Select.Trigger>
					<Select.Content>
						{#each DISCOUNT_TYPE_OPTIONS as t (t.value)}
							<Select.Item value={t.value} label={t.label}>{t.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="camp-value">Rabattverdi</Label>
				<div class="relative">
					<Input
						id="camp-value"
						type="number"
						min="0"
						step={isPercent ? '1' : '10'}
						bind:value={discountValue}
						class="pr-12 tabular-nums"
					/>
					<span
						class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
					>
						{isPercent ? '%' : 'kr'}
					</span>
				</div>
			</div>
		</div>

		<!-- Gjelder pakker -->
		<div class="flex flex-col gap-3 border-t border-border pt-5">
			<p class={sectionLabel}>Gjelder pakker</p>
			{#if packages.length === 0}
				<p class="text-sm text-muted-foreground">Ingen pakker tilgjengelig.</p>
			{:else}
				<div class="flex flex-col divide-y divide-border rounded-lg border border-border">
					{#each packages as p (p.id)}
						<label for="camp-pkg-{p.id}" class="flex cursor-pointer items-center gap-3 px-3 py-2.5">
							<Checkbox
								id="camp-pkg-{p.id}"
								checked={packageIds.includes(p.id)}
								onCheckedChange={(v) => togglePkg(p.id, v === true)}
							/>
							<span class="min-w-0 flex-1 truncate text-sm text-foreground">{p.name}</span>
						</label>
					{/each}
				</div>
				<p class="text-sm text-muted-foreground">Ingen valgt = kampanjen gjelder alle pakker.</p>
			{/if}
		</div>

		<!-- Periode -->
		<div class="flex flex-col gap-4 border-t border-border pt-5">
			<p class={sectionLabel}>Periode</p>
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="camp-from">Gyldig fra</Label>
					<Input id="camp-from" type="date" bind:value={validFrom} />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="camp-to">Gyldig til</Label>
					<Input id="camp-to" type="date" bind:value={validTo} />
				</div>
			</div>
			{#if validFrom && validTo && validFrom > validTo}
				<p class="text-sm text-error">«Gyldig til» må være etter «Gyldig fra».</p>
			{/if}
		</div>

		<!-- Publiser -->
		<div class="border-t border-border pt-5">
			<label for="camp-published" class="flex cursor-pointer items-center gap-3">
				<Switch id="camp-published" bind:checked={published} />
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
