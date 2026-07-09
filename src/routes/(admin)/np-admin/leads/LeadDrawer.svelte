<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { formatDateTime } from '$lib/utils/format';
	import { Collections, AgencyLeadsStatusOptions } from '$lib/pocketbase-types';
	import type { LeadRow, CallSlotRow } from './+page';

	let {
		open = $bindable(false),
		lead = null,
		bookedSlot = null,
		onsaved
	}: {
		open?: boolean;
		lead?: LeadRow | null;
		/** The call slot this lead booked, if any (shows «Booket prat»). */
		bookedSlot?: CallSlotRow | null;
		onsaved?: () => void;
	} = $props();

	const STATUS_OPTIONS = [
		{ value: AgencyLeadsStatusOptions.new, label: 'Ny' },
		{ value: AgencyLeadsStatusOptions.in_dialog, label: 'I dialog' },
		{ value: AgencyLeadsStatusOptions.won, label: 'Vunnet' },
		{ value: AgencyLeadsStatusOptions.lost, label: 'Tapt' }
	];
	const SOURCE_LABELS: Record<string, string> = {
		website: 'Nettside',
		referral: 'Anbefaling',
		other: 'Annet'
	};

	let status = $state<string>(AgencyLeadsStatusOptions.new);
	let saving = $state(false);

	let lastKey = '';
	$effect(() => {
		if (!open || !lead) {
			lastKey = '';
			return;
		}
		if (lead.id === lastKey) return;
		lastKey = lead.id;
		status = lead.status;
	});

	const statusLabel = $derived(STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Ny');

	async function save() {
		if (!lead) return;
		saving = true;
		try {
			await pb.collection(Collections.AgencyLeads).update(lead.id, { status });
			toast.success('Status er oppdatert.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre.');
		} finally {
			saving = false;
		}
	}

	const dtClass = 'text-xs text-muted-foreground';
	const ddClass = 'text-sm text-foreground';
	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer bind:open title={lead?.name ?? 'Lead'} description={lead?.company || undefined}>
	{#if lead}
		<div class="flex flex-col gap-6">
			<!-- Kontakt -->
			<section class="flex flex-col gap-3">
				<p class={sectionLabel}>Kontakt</p>
				<dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>E-post</dt>
						<dd class="truncate {ddClass}">
							<a href="mailto:{lead.email}" class="text-accent-blue-text hover:underline">{lead.email}</a>
						</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Telefon</dt>
						<dd class={ddClass}>
							{#if lead.phone}
								<a href="tel:{lead.phone}" class="text-accent-blue-text hover:underline">{lead.phone}</a>
							{:else}
								—
							{/if}
						</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Bedrift</dt>
						<dd class={ddClass}>{lead.company || '—'}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Kilde</dt>
						<dd class={ddClass}>{SOURCE_LABELS[lead.source] ?? lead.source}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Ønsket prat-tid</dt>
						<dd class={ddClass}>{lead.call_time || '—'}</dd>
					</div>
					{#if bookedSlot}
						<div class="flex flex-col gap-0.5 sm:col-span-2">
							<dt class={dtClass}>Booket prat</dt>
							<dd class="text-sm font-medium text-foreground">{formatDateTime(bookedSlot.starts)}</dd>
						</div>
					{/if}
					<div class="flex flex-col gap-0.5 sm:col-span-2">
						<dt class={dtClass}>Mottatt</dt>
						<dd class={ddClass}>{formatDateTime(lead.created)}</dd>
					</div>
				</dl>
			</section>

			<!-- Melding -->
			<section class="flex flex-col gap-2 border-t border-border pt-5">
				<p class={sectionLabel}>Melding</p>
				{#if lead.message}
					<p class="whitespace-pre-wrap text-sm text-text-body">{lead.message}</p>
				{:else}
					<p class="text-sm text-muted-foreground">Ingen melding.</p>
				{/if}
			</section>

			<!-- Status -->
			<section class="flex flex-col gap-2 border-t border-border pt-5">
				<p class={sectionLabel}>Status</p>
				<div class="flex items-center gap-3">
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger class="w-[220px]">{statusLabel}</Select.Trigger>
						<Select.Content>
							{#each STATUS_OPTIONS as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<StatusBadge collection="agency_leads" {status} />
				</div>
			</section>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving || !lead}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
