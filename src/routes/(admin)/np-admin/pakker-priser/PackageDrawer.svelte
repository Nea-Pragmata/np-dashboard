<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { slugify } from '$lib/utils/format';
	import { Collections } from '$lib/pocketbase-types';
	import type { ModuleKey } from '$lib/utils/modules';
	import { MODULE_META } from './pricing';
	import type { PackageRow } from './+page';

	let {
		open = $bindable(false),
		pkg = null,
		onsaved
	}: {
		open?: boolean;
		/** The package being edited, or `null` to create a new one. */
		pkg?: PackageRow | null;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(pkg));

	let name = $state('');
	let pricePerMonth = $state<number>(0);
	let description = $state('');
	let modules = $state<Record<string, boolean>>({});
	let published = $state(false);
	let saving = $state(false);

	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = pkg?.id ?? 'new';
		if (key === lastKey) return;
		lastKey = key;

		name = pkg?.name ?? '';
		pricePerMonth = pkg?.price_per_month ?? 0;
		// `description` is an editor (HTML) field; strip tags for the plain-text box.
		description = (pkg?.description ?? '').replace(/<[^>]*>/g, '').trim();
		const src = new Set<string>(pkg?.default_modules ?? []);
		const next: Record<string, boolean> = {};
		for (const { key: k } of MODULE_META) next[k] = src.has(k);
		modules = next;
		published = pkg?.published === true;
	});

	const selectedModules = $derived(MODULE_META.filter((m) => modules[m.key]).map((m) => m.key as ModuleKey));
	const canSave = $derived(!saving && name.trim().length > 0 && pricePerMonth >= 0);

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			if (pkg) {
				await pb.collection(Collections.Packages).update(pkg.id, {
					name: name.trim(),
					price_per_month: pricePerMonth,
					description: description.trim(),
					default_modules: selectedModules,
					published
				});
				toast.success('Pakken er oppdatert.');
			} else {
				await pb.collection(Collections.Packages).create({
					name: name.trim(),
					slug: slugify(name),
					price_per_month: pricePerMonth,
					description: description.trim(),
					default_modules: selectedModules,
					highlights: [],
					published
				});
				toast.success('Pakken er opprettet.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre pakken.');
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer bind:open title={editing ? 'Rediger pakke' : 'Ny pakke'}>
	<div class="flex flex-col gap-6">
		<!-- Navn -->
		<div class="flex flex-col gap-1.5">
			<Label for="pkg-name">Navn</Label>
			<Input id="pkg-name" bind:value={name} placeholder="Pakkenavn" />
		</div>

		<!-- Pris per måned -->
		<div class="flex flex-col gap-1.5">
			<Label for="pkg-price">Pris per måned</Label>
			<div class="relative">
				<Input
					id="pkg-price"
					type="number"
					min="0"
					step="10"
					bind:value={pricePerMonth}
					class="pr-10 tabular-nums"
				/>
				<span
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
				>
					kr
				</span>
			</div>
			<p class="text-sm text-muted-foreground">
				Faktureres av byrået. Vises på nettsiden hvis publisert.
			</p>
		</div>

		<!-- Beskrivelse -->
		<div class="flex flex-col gap-1.5">
			<Label for="pkg-desc">Beskrivelse</Label>
			<Textarea id="pkg-desc" bind:value={description} rows={3} placeholder="Kort beskrivelse av pakken …" />
		</div>

		<!-- Standardmoduler -->
		<div class="flex flex-col gap-3 border-t border-border pt-5">
			<p class={sectionLabel}>Standardmoduler</p>
			<p class="text-sm text-muted-foreground">
				Modulene nye kunder på denne pakken får slått på i onboarding.
			</p>
			<div class="flex flex-col divide-y divide-border rounded-lg border border-border">
				{#each MODULE_META as m (m.key)}
					<label for="pkg-mod-{m.key}" class="flex cursor-pointer items-center gap-3 px-3 py-2.5">
						<Checkbox
							id="pkg-mod-{m.key}"
							checked={modules[m.key]}
							onCheckedChange={(v) => (modules[m.key] = v === true)}
						/>
						<span class="min-w-0 flex-1 text-sm text-foreground">{m.label}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Publiser -->
		<div class="border-t border-border pt-5">
			<label for="pkg-published" class="flex cursor-pointer items-center gap-3">
				<Switch id="pkg-published" bind:checked={published} />
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
