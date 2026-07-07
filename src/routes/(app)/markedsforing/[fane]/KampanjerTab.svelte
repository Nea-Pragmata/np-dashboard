<script lang="ts">
	import { navigating } from '$app/state';
	import Mail from '@lucide/svelte/icons/mail';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import { formatNumber, formatTime } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { pb } from '$lib/pb';
	import { Collections, CampaignsStatusOptions } from '$lib/pocketbase-types';
	import type { TableState } from '$lib/types';
	import { formatDayMonth, type CampaignRow } from '../marketing';

	let {
		campaigns,
		businessId,
		onNew,
		onEdit,
		onchanged
	}: {
		campaigns: CampaignRow[];
		businessId: string;
		/** Open the multi-step flow to create a campaign. */
		onNew: () => void;
		/** Open the flow to edit an existing (draft/scheduled) campaign. */
		onEdit: (c: CampaignRow) => void;
		/** Called after a mutation so the parent can invalidate. */
		onchanged: () => void;
	} = $props();

	const CHANNEL = {
		email: { icon: Mail, label: 'E-post' },
		sms: { icon: Smartphone, label: 'SMS' }
	} as const;

	/** Recipient count from the audience snapshot (blank until a segment is set). */
	function recipientCount(c: CampaignRow): string {
		return typeof c.audience?.count === 'number' ? formatNumber(c.audience.count) : '—';
	}

	/** SENDT column: sent date, or the scheduled clock, or a dash for drafts. */
	function scheduleText(c: CampaignRow): string {
		if (c.status === CampaignsStatusOptions.sent) {
			return c.sent_at ? formatDayMonth(c.sent_at) : '—';
		}
		if (c.status === CampaignsStatusOptions.scheduled) {
			return c.scheduled_at
				? `${formatDayMonth(c.scheduled_at)} ${formatTime(c.scheduled_at)}`
				: '—';
		}
		return '—';
	}

	/** RESULTAT column: open-rate + clicks for e-mail, bookings for SMS. */
	function resultText(c: CampaignRow): string {
		if (c.status !== CampaignsStatusOptions.sent) return '—';
		const r = c.results ?? {};
		if (c.channel === 'email') {
			const parts: string[] = [];
			if (typeof r.open_rate === 'number') parts.push(`${r.open_rate} % åpnet`);
			if (typeof r.clicks === 'number') parts.push(`${r.clicks} klikk`);
			return parts.length ? parts.join(' · ') : '—';
		}
		if (typeof r.bookings === 'number') {
			return `${r.bookings} ${r.bookings === 1 ? 'booking' : 'bookinger'}`;
		}
		return '—';
	}

	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname.startsWith('/markedsforing/kampanjer')
	);
	const tableState = $derived<TableState<CampaignRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: campaigns
	});

	// --- duplicate -----------------------------------------------------------
	async function duplicate(c: CampaignRow) {
		try {
			await pb.collection(Collections.Campaigns).create({
				business: businessId,
				name: `${c.name} (kopi)`,
				channel: c.channel,
				subject: c.subject ?? '',
				message: c.message,
				audience: c.audience ?? {},
				// A copy always starts as an editable draft.
				status: CampaignsStatusOptions.draft
			});
			toast.success('Kampanjen er duplisert.');
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	// --- delete (drafts only) ------------------------------------------------
	let deleteOpen = $state(false);
	let deleteTarget = $state<CampaignRow | null>(null);
	function askDelete(c: CampaignRow) {
		deleteTarget = c;
		deleteOpen = true;
	}
	async function confirmDelete() {
		const c = deleteTarget;
		if (!c) return;
		try {
			await pb.collection(Collections.Campaigns).delete(c.id);
			toast.success('Kampanjen er slettet.');
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<DataTable
	state={tableState}
	columns={7}
	onRetry={onchanged}
	empty={{
		icon: Megaphone,
		title: 'Ingen kampanjer ennå',
		description: 'Lag din første e-post- eller SMS-kampanje og nå kundene som har gitt samtykke.',
		action: newCampaignCta
	}}
>
	{#snippet header()}
		<th>Kampanje</th>
		<th>Kanal</th>
		<th><div class="text-right">Mottakere</div></th>
		<th>Status</th>
		<th>Sendt</th>
		<th>Resultat</th>
		<th class="w-[52px]"><span class="sr-only">Handlinger</span></th>
	{/snippet}
	{#snippet row(c)}
		{@const channel = CHANNEL[c.channel]}
		<td class="font-medium text-foreground">{c.name}</td>
		<td>
			<span class="flex items-center gap-2 text-muted-foreground">
				<channel.icon class="size-4 shrink-0" aria-hidden="true" />
				{channel.label}
			</span>
		</td>
		<td class="text-right tabular-nums text-foreground">{recipientCount(c)}</td>
		<td><StatusBadge collection="campaigns" status={c.status} /></td>
		<td class="whitespace-nowrap text-muted-foreground">{scheduleText(c)}</td>
		<td class="text-muted-foreground">{resultText(c)}</td>
		<td>
			<div class="flex justify-end">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {c.name}">
						<Ellipsis class="size-4" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						{#if c.status !== CampaignsStatusOptions.sent}
							<DropdownMenu.Item onSelect={() => onEdit(c)}>Rediger</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Item onSelect={() => duplicate(c)}>Dupliser</DropdownMenu.Item>
						{#if c.status === CampaignsStatusOptions.draft}
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								class="text-destructive data-highlighted:text-destructive"
								onSelect={() => askDelete(c)}
							>
								Slett
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</td>
	{/snippet}
</DataTable>

{#snippet newCampaignCta()}
	<Button onclick={onNew}>Ny kampanje</Button>
{/snippet}

<ConfirmDialog
	bind:open={deleteOpen}
	title="Slette kampanjen?"
	description={deleteTarget
		? `Utkastet «${deleteTarget.name}» slettes. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Slett"
	cancelLabel="Avbryt"
	destructive
	onconfirm={confirmDelete}
/>
