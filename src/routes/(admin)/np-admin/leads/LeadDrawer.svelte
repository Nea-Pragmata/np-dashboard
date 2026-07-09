<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { formatDateTime } from '$lib/utils/format';
	import { Collections, AgencyLeadsStatusOptions } from '$lib/pocketbase-types';
	import type { LeadRow, CallSlotRow, Person } from './+page';

	let {
		open = $bindable(false),
		lead = null,
		bookedSlot = null,
		people = [],
		onsaved
	}: {
		open?: boolean;
		lead?: LeadRow | null;
		/** The call slot this lead booked, if any (shows «Booket prat»). */
		bookedSlot?: CallSlotRow | null;
		/** Assignable agency people for «Ansvarlig». */
		people?: Person[];
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
	const UNASSIGNED = '';

	// --- editable working copy ----------------------------------------------
	let name = $state('');
	let company = $state('');
	let email = $state('');
	let phone = $state('');
	let callTime = $state('');
	let message = $state('');
	let note = $state('');
	let assignedTo = $state<string>(UNASSIGNED);
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
		name = lead.name ?? '';
		company = lead.company ?? '';
		email = lead.email ?? '';
		phone = lead.phone ?? '';
		callTime = lead.call_time ?? '';
		message = lead.message ?? '';
		note = lead.note ?? '';
		assignedTo = lead.assigned_to ?? UNASSIGNED;
		status = lead.status;
	});

	const statusLabel = $derived(STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Ny');
	const assignedLabel = $derived(
		assignedTo
			? (people.find((p) => p.id === assignedTo)?.name ?? lead?.expand?.assigned_to?.name ?? 'Ukjent')
			: 'Ingen'
	);
	const canSave = $derived(!saving && name.trim().length > 0 && email.trim().length > 0);

	async function save() {
		if (!lead || !canSave) return;
		saving = true;
		try {
			await pb.collection(Collections.AgencyLeads).update(lead.id, {
				name: name.trim(),
				company: company.trim(),
				email: email.trim(),
				phone: phone.trim(),
				call_time: callTime.trim(),
				message: message.trim(),
				note: note.trim(),
				assigned_to: assignedTo || null,
				status
			});
			toast.success('Leaden er lagret.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre.');
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
	const dtClass = 'text-xs text-muted-foreground';
	const ddClass = 'text-sm text-foreground';
</script>

<Drawer bind:open title={lead?.name ?? 'Lead'} description={lead?.company || undefined}>
	{#if lead}
		<div class="flex flex-col gap-6">
			<!-- Kontakt (redigerbar) -->
			<section class="flex flex-col gap-3">
				<p class={sectionLabel}>Kontakt</p>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<Label for="lead-name">Navn</Label>
						<Input id="lead-name" bind:value={name} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="lead-company">Bedrift</Label>
						<Input id="lead-company" bind:value={company} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="lead-email">E-post</Label>
						<Input id="lead-email" type="email" bind:value={email} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="lead-phone">Telefon</Label>
						<Input id="lead-phone" type="tel" bind:value={phone} />
					</div>
					<div class="flex flex-col gap-1.5 sm:col-span-2">
						<Label for="lead-calltime">Ønsket prat-tid</Label>
						<Input id="lead-calltime" bind:value={callTime} placeholder="F.eks. «helst etter kl. 17»" />
					</div>
				</div>
			</section>

			<!-- Booket prat + metadata (skrivebeskyttet) -->
			<section class="flex flex-col gap-3 border-t border-border pt-5">
				<dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
					{#if bookedSlot}
						<div class="flex flex-col gap-0.5 sm:col-span-2">
							<dt class={dtClass}>Booket prat</dt>
							<dd class="text-sm font-medium text-foreground">{formatDateTime(bookedSlot.starts)}</dd>
						</div>
					{/if}
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Kilde</dt>
						<dd class={ddClass}>{SOURCE_LABELS[lead.source] ?? lead.source}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Mottatt</dt>
						<dd class={ddClass}>{formatDateTime(lead.created)}</dd>
					</div>
				</dl>
			</section>

			<!-- Melding -->
			<section class="flex flex-col gap-1.5 border-t border-border pt-5">
				<Label for="lead-message">Melding</Label>
				<Textarea id="lead-message" bind:value={message} rows={3} />
			</section>

			<!-- Oppfølging -->
			<section class="flex flex-col gap-4 border-t border-border pt-5">
				<p class={sectionLabel}>Oppfølging</p>
				<div class="flex flex-col gap-1.5">
					<Label for="lead-assigned">Ansvarlig</Label>
					<Select.Root type="single" bind:value={assignedTo}>
						<Select.Trigger id="lead-assigned" class="w-full">{assignedLabel}</Select.Trigger>
						<Select.Content>
							<Select.Item value={UNASSIGNED} label="Ingen">Ingen</Select.Item>
							{#each people as p (p.id)}
								<Select.Item value={p.id} label={p.name}>{p.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="lead-status">Status</Label>
					<div class="flex items-center gap-3">
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger id="lead-status" class="flex-1">{statusLabel}</Select.Trigger>
							<Select.Content>
								{#each STATUS_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<StatusBadge collection="agency_leads" {status} />
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="lead-note">Internt notat</Label>
					<Textarea
						id="lead-note"
						bind:value={note}
						rows={2}
						placeholder="Bare synlig for byrået …"
					/>
				</div>
			</section>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave || !lead}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
