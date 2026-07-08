<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { formatKr } from '$lib/utils/format';
	import {
		Collections,
		SubscriptionsStatusOptions,
		SubscriptionsBillingIntervalOptions
	} from '$lib/pocketbase-types';
	import {
		computeMonthly,
		computeRecurring,
		computeOneTime,
		INTERVAL_OPTIONS,
		intervalSuffix,
		type PricedAddon
	} from './pricing';
	import type { SubRow, PackageRow, AddonRow, CampaignRow, BusinessRow } from './+page';

	let {
		open = $bindable(false),
		subscription = null,
		packages = [],
		addons = [],
		campaigns = [],
		availableBusinesses = [],
		onsaved
	}: {
		open?: boolean;
		/** The subscription being edited, or `null` to create one for a business. */
		subscription?: SubRow | null;
		packages?: PackageRow[];
		addons?: AddonRow[];
		campaigns?: CampaignRow[];
		/** Businesses that don't yet have a subscription (create only). */
		availableBusinesses?: BusinessRow[];
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(subscription));

	const STATUS_OPTIONS = [
		{ value: SubscriptionsStatusOptions.active, label: 'Aktivt' },
		{ value: SubscriptionsStatusOptions.paused, label: 'Pauset' },
		{ value: SubscriptionsStatusOptions.ended, label: 'Avsluttet' }
	];

	let businessId = $state('');
	let packageId = $state('');
	let addonIds = $state<string[]>([]);
	let campaignId = $state('');
	let priceOverride = $state<number | null>(null);
	let billingInterval = $state<string>(SubscriptionsBillingIntervalOptions.month);
	let setupFee = $state<number | null>(null);
	let startDate = $state('');
	let status = $state<string>(SubscriptionsStatusOptions.active);
	let invoiceNote = $state('');
	let saving = $state(false);

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
		const key = subscription?.id ?? 'new';
		if (key === lastKey) return;
		lastKey = key;

		businessId = subscription?.business ?? '';
		packageId = subscription?.package ?? '';
		addonIds = subscription ? [...(subscription.addons ?? [])] : [];
		campaignId = subscription?.campaign ?? '';
		priceOverride = subscription?.price_override ? subscription.price_override : null;
		billingInterval = subscription?.billing_interval || SubscriptionsBillingIntervalOptions.month;
		setupFee = subscription?.setup_fee ? subscription.setup_fee : null;
		startDate = subscription ? toDateInput(subscription.start_date) : toDateInput(new Date().toISOString());
		status = subscription?.status ?? SubscriptionsStatusOptions.active;
		invoiceNote = subscription?.invoice_note ?? '';
	});

	// Package options — include the current (possibly unpublished) package so an
	// existing subscription's selection is never silently dropped.
	const packageOptions = $derived.by(() => {
		const opts = packages.map((p) => ({ value: p.id, label: p.name }));
		if (subscription && packageId && !opts.some((o) => o.value === packageId)) {
			opts.unshift({ value: packageId, label: subscription.expand?.package?.name ?? 'Upublisert pakke' });
		}
		return opts;
	});

	const businessName = $derived(
		subscription?.expand?.business?.name ??
			availableBusinesses.find((b) => b.id === businessId)?.name ??
			'—'
	);
	const packageLabel = $derived(
		packageOptions.find((o) => o.value === packageId)?.label ?? 'Velg pakke'
	);
	const campaignLabel = $derived(
		campaignId ? (campaigns.find((c) => c.id === campaignId)?.name ?? 'Kampanje') : 'Ingen kampanje'
	);
	const statusLabel = $derived(STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Aktivt');
	const intervalLabel = $derived(
		INTERVAL_OPTIONS.find((o) => o.value === billingInterval)?.label ?? 'Per måned'
	);
	const businessLabel = $derived(
		businessId ? (availableBusinesses.find((b) => b.id === businessId)?.name ?? 'Velg bedrift') : 'Velg bedrift'
	);

	function toggleAddon(id: string, on: boolean) {
		addonIds = on ? [...addonIds, id] : addonIds.filter((x) => x !== id);
	}

	// Live price preview: the recurring figure for the chosen interval, plus the
	// one-time startup cost (setup fee + one-time add-ons), shown separately.
	const chosenAddons = $derived<PricedAddon[]>(
		addons.filter((a) => addonIds.includes(a.id)).map((a) => ({ price: a.price, price_type: a.price_type }))
	);
	const monthlyBase = $derived.by(() => {
		const pkg = packages.find((p) => p.id === packageId);
		const pkgPrice = pkg ? pkg.price_per_month : null;
		const camp = campaigns.find((c) => c.id === campaignId);
		const discount = camp
			? { discount_type: camp.discount_type, discount_value: camp.discount_value }
			: null;
		return computeMonthly(pkgPrice, chosenAddons, discount, null);
	});
	const recurringPreview = $derived(computeRecurring(monthlyBase, billingInterval, priceOverride));
	const oneTimePreview = $derived(computeOneTime(chosenAddons, setupFee));

	const canSave = $derived(!saving && Boolean(businessId && packageId && startDate));

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = {
				package: packageId,
				addons: addonIds,
				campaign: campaignId || null,
				price_override: priceOverride && priceOverride > 0 ? priceOverride : null,
				billing_interval: billingInterval,
				setup_fee: setupFee && setupFee > 0 ? setupFee : null,
				start_date: new Date(startDate).toISOString(),
				status,
				invoice_note: invoiceNote.trim()
			};
			if (subscription) {
				await pb.collection(Collections.Subscriptions).update(subscription.id, payload);
				toast.success('Abonnementet er oppdatert.');
			} else {
				await pb.collection(Collections.Subscriptions).create({ business: businessId, ...payload });
				toast.success('Abonnementet er opprettet.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre abonnementet.');
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer
	bind:open
	title={editing ? 'Rediger abonnement' : 'Nytt abonnement'}
	description={editing ? businessName : 'Knytt en bedrift til en pakke.'}
>
	<div class="flex flex-col gap-6">
		<!-- Bedrift -->
		{#if editing}
			<div class="flex flex-col gap-1">
				<p class={sectionLabel}>Bedrift</p>
				<p class="text-sm font-medium text-foreground">{businessName}</p>
			</div>
		{:else}
			<div class="flex flex-col gap-1.5">
				<Label for="sub-business">Bedrift</Label>
				{#if availableBusinesses.length === 0}
					<p class="text-sm text-muted-foreground">
						Alle bedrifter har allerede et abonnement.
					</p>
				{:else}
					<Select.Root type="single" bind:value={businessId}>
						<Select.Trigger id="sub-business" class="w-full">{businessLabel}</Select.Trigger>
						<Select.Content>
							{#each availableBusinesses as b (b.id)}
								<Select.Item value={b.id} label={b.name}>{b.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>
		{/if}

		<!-- Pakke -->
		<div class="flex flex-col gap-1.5">
			<Label for="sub-package">Pakke</Label>
			<Select.Root type="single" bind:value={packageId}>
				<Select.Trigger id="sub-package" class="w-full">{packageLabel}</Select.Trigger>
				<Select.Content>
					{#each packageOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label}>{o.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Tillegg -->
		<div class="flex flex-col gap-1.5">
			<Label>Tilleggstjenester</Label>
			{#if addons.length === 0}
				<p class="text-sm text-muted-foreground">Ingen tilleggstjenester tilgjengelig.</p>
			{:else}
				<div class="flex flex-col divide-y divide-border rounded-lg border border-border">
					{#each addons as a (a.id)}
						<label for="sub-addon-{a.id}" class="flex cursor-pointer items-center gap-3 px-3 py-2.5">
							<Checkbox
								id="sub-addon-{a.id}"
								checked={addonIds.includes(a.id)}
								onCheckedChange={(v) => toggleAddon(a.id, v === true)}
							/>
							<span class="min-w-0 flex-1 truncate text-sm text-foreground">{a.name}</span>
							<span class="shrink-0 text-xs text-muted-foreground">{formatKr(a.price)}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Kampanje -->
		<div class="flex flex-col gap-1.5">
			<Label for="sub-campaign">Kampanje</Label>
			<Select.Root type="single" bind:value={campaignId}>
				<Select.Trigger id="sub-campaign" class="w-full">{campaignLabel}</Select.Trigger>
				<Select.Content>
					<Select.Item value="" label="Ingen kampanje">Ingen kampanje</Select.Item>
					{#each campaigns as c (c.id)}
						<Select.Item value={c.id} label={c.name}>{c.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Pris -->
		<div class="flex flex-col gap-4 border-t border-border pt-5">
			<div class="flex items-baseline justify-between gap-2">
				<p class={sectionLabel}>Driftspris</p>
				<span class="text-sm font-semibold tabular-nums text-foreground">
					{recurringPreview == null ? '—' : `${formatKr(recurringPreview)}${intervalSuffix(billingInterval)}`}
				</span>
			</div>

			<!-- Faktureringsintervall -->
			<div class="flex flex-col gap-1.5">
				<Label for="sub-interval">Faktureres</Label>
				<Select.Root type="single" bind:value={billingInterval}>
					<Select.Trigger id="sub-interval" class="w-full">{intervalLabel}</Select.Trigger>
					<Select.Content>
						{#each INTERVAL_OPTIONS as o (o.value)}
							<Select.Item value={o.value} label={o.label}>{o.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-sm text-muted-foreground">
					Årspris beregnes som 12 × månedsprisen med mindre du overstyrer.
				</p>
			</div>

			<!-- Overstyr driftspris -->
			<div class="flex flex-col gap-1.5">
				<Label for="sub-override">Overstyr driftspris (valgfritt)</Label>
				<div class="relative">
					<Input
						id="sub-override"
						type="number"
						min="0"
						step="10"
						placeholder="Beregnes automatisk"
						bind:value={priceOverride}
						class="pr-10 tabular-nums"
					/>
					<span
						class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
					>
						kr
					</span>
				</div>
			</div>

			<!-- Oppstartspris (engangs) -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-2">
					<Label for="sub-setup">Oppstartspris (engangs)</Label>
					<span class="text-xs tabular-nums text-muted-foreground">
						Oppstart totalt: {formatKr(oneTimePreview)}
					</span>
				</div>
				<div class="relative">
					<Input
						id="sub-setup"
						type="number"
						min="0"
						step="100"
						placeholder="0"
						bind:value={setupFee}
						class="pr-10 tabular-nums"
					/>
					<span
						class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
					>
						kr
					</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Faktureres én gang ved oppstart. Engangs tilleggstjenester legges til i totalen.
				</p>
			</div>
		</div>

		<!-- Plan -->
		<div class="flex flex-col gap-4 border-t border-border pt-5">
			<div class="flex flex-col gap-1.5">
				<Label for="sub-start">Startdato</Label>
				<Input id="sub-start" type="date" bind:value={startDate} />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="sub-status">Status</Label>
				<div class="flex items-center gap-3">
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger id="sub-status" class="flex-1">{statusLabel}</Select.Trigger>
						<Select.Content>
							{#each STATUS_OPTIONS as s (s.value)}
								<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<StatusBadge collection="subscriptions" {status} />
				</div>
			</div>
		</div>

		<!-- Fakturanotat -->
		<div class="flex flex-col gap-1.5 border-t border-border pt-5">
			<Label for="sub-note">Fakturanotat (valgfritt)</Label>
			<Textarea id="sub-note" bind:value={invoiceNote} rows={2} placeholder="Intern kommentar …" />
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
