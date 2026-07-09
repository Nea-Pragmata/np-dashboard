<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Clock from '@lucide/svelte/icons/clock';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { formatDateTime } from '$lib/utils/format';
	import { Collections, AgencyCallSlotsStatusOptions } from '$lib/pocketbase-types';
	import type { CallSlotRow } from './+page';

	let {
		slots = [],
		onchanged
	}: {
		/** All call slots (open + booked), sorted by `starts`. */
		slots?: CallSlotRow[];
		/** Called after a slot is added or removed so the parent can invalidate. */
		onchanged?: () => void;
	} = $props();

	// datetime-local value, e.g. "2026-07-15T19:00". Empty = nothing to add.
	let newSlot = $state('');
	let saving = $state(false);
	let removingId = $state('');
	// Booked-slot deletion goes through a confirm (an open slot is deleted directly).
	let confirmOpen = $state(false);
	let pendingDelete = $state<CallSlotRow | null>(null);

	// Local-time floor for the datetime-local picker (`min`), so past slots aren't offered.
	function localDatetimeValue(d: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
	const minSlot = localDatetimeValue(new Date());

	async function add() {
		if (!newSlot || saving) return;
		const d = new Date(newSlot);
		if (Number.isNaN(d.getTime())) {
			toast.error('Ugyldig tidspunkt.');
			return;
		}
		// preventDefault bypasses the input's native `min`, so re-check here.
		if (d.getTime() < Date.now()) {
			toast.error('Tidspunktet er i fortiden.');
			return;
		}
		saving = true;
		try {
			await pb.collection(Collections.AgencyCallSlots).create({
				starts: d.toISOString(),
				status: AgencyCallSlotsStatusOptions.open
			});
			newSlot = '';
			toast.success('Tiden er lagt til.');
			onchanged?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke legge til tiden.');
		} finally {
			saving = false;
		}
	}

	// A booked slot holds a lead's booking — confirm before dropping it. Open
	// slots are pure availability, so they're removed directly.
	function requestRemove(slot: CallSlotRow) {
		if (removingId) return;
		if (slot.status === AgencyCallSlotsStatusOptions.booked) {
			pendingDelete = slot;
			confirmOpen = true;
		} else {
			doRemove(slot);
		}
	}

	async function doRemove(slot: CallSlotRow) {
		if (removingId) return;
		removingId = slot.id;
		try {
			await pb.collection(Collections.AgencyCallSlots).delete(slot.id);
			toast.success('Tiden er fjernet.');
			onchanged?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke fjerne tiden.');
		} finally {
			removingId = '';
		}
	}

	function leadName(slot: CallSlotRow): string {
		return slot.expand?.lead?.name ?? 'En lead';
	}
</script>

<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
	<div class="flex flex-col gap-1">
		<h2 class="text-base font-semibold text-foreground">Ledige prat-tider</h2>
		<p class="text-sm text-muted-foreground">
			Tidene du kan ta en prat. De vises som «Book en prat» på nettsiden — en lead som booker,
			dukker opp her.
		</p>
	</div>

	<!-- Legg til tid -->
	<form
		class="flex flex-col gap-2 sm:flex-row sm:items-end"
		onsubmit={(e) => {
			e.preventDefault();
			add();
		}}
	>
		<div class="flex flex-1 flex-col gap-1.5">
			<label for="new-slot" class="text-xs text-muted-foreground">Nytt tidspunkt</label>
			<Input
				id="new-slot"
				type="datetime-local"
				min={minSlot}
				bind:value={newSlot}
				class="tabular-nums"
			/>
		</div>
		<Button type="submit" disabled={!newSlot || saving}>
			<Plus class="size-4" />
			{saving ? 'Legger til …' : 'Legg til'}
		</Button>
	</form>

	<!-- Liste -->
	{#if slots.length === 0}
		<div
			class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center"
		>
			<Clock class="size-6 text-text-subtle" />
			<p class="text-sm text-muted-foreground">
				Ingen tider ennå. Legg til tider du kan ta en prat.
			</p>
		</div>
	{:else}
		<ul class="flex flex-col divide-y divide-border rounded-lg border border-border">
			{#each slots as slot (slot.id)}
				<li class="flex items-center gap-3 px-3 py-2.5">
					<Clock class="size-4 shrink-0 text-text-subtle" />
					<span class="min-w-0 flex-1 text-sm tabular-nums text-foreground">
						{formatDateTime(slot.starts)}
						{#if slot.status === AgencyCallSlotsStatusOptions.booked}
							<span class="text-muted-foreground"> · {leadName(slot)}</span>
						{/if}
					</span>
					<StatusBadge collection="agency_call_slots" status={slot.status} />
					<button
						type="button"
						onclick={() => requestRemove(slot)}
						disabled={!!removingId}
						aria-label="Fjern tid {formatDateTime(slot.starts)}"
						class="flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-error focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
					>
						<Trash2 class="size-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Fjerne booket prat-tid?"
	description={pendingDelete
		? `${formatDateTime(pendingDelete.starts)} er booket av ${pendingDelete.expand?.lead?.name ?? 'en lead'}. Tiden og koblingen til leaden fjernes.`
		: undefined}
	confirmLabel="Fjern tiden"
	destructive
	onconfirm={() => {
		if (pendingDelete) doRemove(pendingDelete);
		pendingDelete = null;
	}}
/>
