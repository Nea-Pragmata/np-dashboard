<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { Collections, AgencyCallSlotsStatusOptions } from '$lib/pocketbase-types';
	import type { CallSlotRow, LeadRow } from './+page';

	let {
		open = $bindable(false),
		slot = null,
		leads = [],
		onsaved
	}: {
		open?: boolean;
		slot?: CallSlotRow | null;
		/** Leads to pick from when marking a slot booked. */
		leads?: LeadRow[];
		onsaved?: () => void;
	} = $props();

	const STATUS_OPTIONS = [
		{ value: AgencyCallSlotsStatusOptions.open, label: 'Ledig' },
		{ value: AgencyCallSlotsStatusOptions.booked, label: 'Booket' }
	];
	const NO_LEAD = '';

	// Render an ISO instant as a `datetime-local` value in the viewer's local time.
	function toLocalInput(iso?: string): string {
		if (!iso) return '';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	let starts = $state('');
	let status = $state<string>(AgencyCallSlotsStatusOptions.open);
	let leadId = $state<string>(NO_LEAD);
	let saving = $state(false);

	let lastKey = '';
	$effect(() => {
		if (!open || !slot) {
			lastKey = '';
			return;
		}
		if (slot.id === lastKey) return;
		lastKey = slot.id;
		starts = toLocalInput(slot.starts);
		status = slot.status;
		leadId = slot.lead ?? NO_LEAD;
	});

	const isBooked = $derived(status === AgencyCallSlotsStatusOptions.booked);
	const statusLabel = $derived(STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Ledig');
	const leadLabel = $derived(
		leadId ? (leads.find((l) => l.id === leadId)?.name ?? 'Ukjent lead') : 'Velg lead'
	);
	const canSave = $derived(!saving && starts.length > 0);

	async function save() {
		if (!slot || !canSave) return;
		const d = new Date(starts);
		if (Number.isNaN(d.getTime())) {
			toast.error('Ugyldig tidspunkt.');
			return;
		}
		// An open slot is offered publicly on «Book en prat», so it can't be in the
		// past; a booked slot may be (e.g. logging a call that already happened).
		if (!isBooked && d.getTime() < Date.now()) {
			toast.error('En ledig tid kan ikke være i fortiden.');
			return;
		}
		saving = true;
		try {
			await pb.collection(Collections.AgencyCallSlots).update(slot.id, {
				starts: d.toISOString(),
				status,
				// An open slot never keeps a lead; a booked slot links the chosen one (may be blank).
				lead: isBooked ? leadId || null : null
			});
			toast.success('Tiden er lagret.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre tiden.');
		} finally {
			saving = false;
		}
	}
</script>

<Drawer bind:open title="Rediger prat-tid">
	{#if slot}
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-1.5">
				<Label for="slot-starts">Tidspunkt</Label>
				<Input id="slot-starts" type="datetime-local" bind:value={starts} class="tabular-nums" />
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="slot-status">Status</Label>
				<div class="flex items-center gap-3">
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger id="slot-status" class="flex-1">{statusLabel}</Select.Trigger>
						<Select.Content>
							{#each STATUS_OPTIONS as s (s.value)}
								<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<StatusBadge collection="agency_call_slots" {status} />
				</div>
			</div>

			{#if isBooked}
				<div class="flex flex-col gap-1.5">
					<Label for="slot-lead">Booket av</Label>
					<Select.Root type="single" bind:value={leadId}>
						<Select.Trigger id="slot-lead" class="w-full">{leadLabel}</Select.Trigger>
						<Select.Content>
							<Select.Item value={NO_LEAD} label="Ingen lead">Ingen lead</Select.Item>
							{#each leads as l (l.id)}
								<Select.Item value={l.id} label={l.name}>
									{l.name}{l.company ? ` · ${l.company}` : ''}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="text-sm text-muted-foreground">
						Koble tiden til en lead. La stå «Ingen lead» hvis du ikke vet hvem ennå.
					</p>
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave || !slot}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
