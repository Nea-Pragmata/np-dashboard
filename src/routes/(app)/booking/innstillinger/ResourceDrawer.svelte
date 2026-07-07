<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections, type UsersResponse } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import type { ResourceRow } from './+page';

	let {
		open = $bindable(false),
		resource = null,
		staff,
		businessId,
		onsaved
	}: {
		open?: boolean;
		/** The resource being edited, or `null` to create a new one. */
		resource?: ResourceRow | null;
		staff: UsersResponse[];
		businessId: string;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(resource));
	const NONE = '__none__'; // Select sentinel for "no staff"

	let name = $state('');
	let staffId = $state('');
	let active = $state(true);
	let saving = $state(false);
	let nameError = $state('');

	// Re-seed the working copy each time the drawer opens (keyed on resource id so
	// it never fights in-progress edits).
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = resource?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;

		if (resource) {
			name = resource.name;
			staffId = resource.staff || '';
			active = resource.active ?? true;
		} else {
			name = '';
			staffId = '';
			active = true;
		}
		nameError = '';
	});

	const staffLabel = $derived(staff.find((s) => s.id === staffId)?.name ?? 'Ingen ansatt');

	async function save() {
		nameError = name.trim() ? '' : 'Skriv inn et navn på ressursen.';
		if (nameError) return;

		saving = true;
		try {
			if (resource) {
				// Update: NEVER send business (customer rule requires business:isset=false).
				// Sending staff:"" clears the relation.
				await pb.collection(Collections.Resources).update(resource.id, {
					name: name.trim(),
					staff: staffId,
					active
				});
			} else {
				// Create: business is required (EB rule).
				const payload: Record<string, unknown> = {
					business: businessId,
					name: name.trim(),
					active
				};
				if (staffId) payload.staff = staffId;
				await pb.collection(Collections.Resources).create(payload);
			}
			toast.success(editing ? 'Ressursen er lagret.' : 'Ressursen er lagt til.');
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
	title={editing ? 'Rediger ressurs' : 'Ny ressurs'}
	description={editing
		? 'Endre navn eller hvem ressursen tilhører.'
		: 'Legg til en ressurs, f.eks. en stol eller et behandlingsrom.'}
>
	<div class="flex flex-col gap-5">
		<Field.Field data-invalid={nameError ? 'true' : undefined}>
			<Field.Label for="r-name">Navn<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="r-name"
				bind:value={name}
				placeholder="F.eks. Stol 1"
				aria-invalid={Boolean(nameError)}
				oninput={() => (nameError = '')}
			/>
			{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="r-staff">Ansatt</Field.Label>
			<Select.Root
				type="single"
				value={staffId || NONE}
				onValueChange={(v) => (staffId = v === NONE ? '' : v)}
			>
				<Select.Trigger id="r-staff" class="w-full">{staffLabel}</Select.Trigger>
				<Select.Content>
					<Select.Item value={NONE} label="Ingen ansatt">Ingen ansatt</Select.Item>
					{#each staff as s (s.id)}
						<Select.Item value={s.id} label={s.name}>{s.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<Field.Description>Valgfritt. Knytt ressursen til en ansatt.</Field.Description>
		</Field.Field>

		<div class="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
			<div class="flex flex-col">
				<span class="text-sm font-medium text-foreground">Aktiv</span>
				<span class="text-sm text-muted-foreground">Inaktive ressurser kan ikke bookes.</span>
			</div>
			<Switch bind:checked={active} aria-label="Aktiv" />
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{#if saving}
				{editing ? 'Lagrer …' : 'Legger til …'}
			{:else}
				{editing ? 'Lagre endringer' : 'Legg til ressurs'}
			{/if}
		</Button>
	{/snippet}
</Drawer>
