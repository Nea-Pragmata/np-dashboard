<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Info from '@lucide/svelte/icons/info';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Armchair from '@lucide/svelte/icons/armchair';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import ResourceDrawer from './ResourceDrawer.svelte';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import { DAY_KEYS, type DayKey, type OpeningHours } from '../week';
	import type { PageData } from './$types';
	import type { Reminders, Deposit, WaitlistConfig, ResourceRow } from './+page';

	let { data }: { data: PageData } = $props();

	const businessId = $derived(data.business?.id ?? '');
	const businessName = $derived(data.business?.name ?? 'bedriften');
	// booking_settings may be missing for a customer-owned tenant (Create rule is
	// agency-only). When so, the reminder/deposit/waitlist cards go read-only.
	const hasSettings = $derived(Boolean(data.settings));

	// --- opening hours (businesses.opening_hours) ----------------------------
	type DayForm = { key: DayKey; label: string; open: string; close: string; closed: boolean };
	const DAY_LABELS: Record<DayKey, string> = {
		mon: 'Mandag',
		tue: 'Tirsdag',
		wed: 'Onsdag',
		thu: 'Torsdag',
		fri: 'Fredag',
		sat: 'Lørdag',
		sun: 'Søndag'
	};

	let days = $state<DayForm[]>([]);

	// --- reminders / deposit / waitlist (booking_settings) -------------------
	let smsReminder = $state(false);
	let emailReminder = $state(false);
	let hoursBefore = $state('24');
	let followUp = $state(false);

	let depositEnabled = $state(false);
	let depositPercent = $state(20);
	let depositMinAmount = $state(0);

	let waitlistEnabled = $state(false);
	let cancellationHours = $state('24');

	// Re-seed the whole form from freshly-loaded data (initial load + after a save
	// re-runs the load via invalidate). The effect writes state it does not read,
	// so it never loops.
	$effect(() => {
		const oh = data.openingHours;
		days = DAY_KEYS.map((k) => {
			const d = oh?.[k];
			return {
				key: k,
				label: DAY_LABELS[k],
				open: d?.open ?? '09:00',
				close: d?.close ?? '17:00',
				closed: !d
			};
		});

		const r = (data.settings?.reminders ?? {}) as Reminders;
		smsReminder = r.sms ?? false;
		emailReminder = r.email ?? false;
		hoursBefore = String(r.hours_before ?? 24);
		followUp = r.follow_up ?? false;

		const dep = (data.settings?.deposit ?? {}) as Deposit;
		depositEnabled = dep.enabled ?? false;
		depositPercent = dep.percent ?? 20;
		depositMinAmount = dep.min_amount ?? 0;

		const w = (data.settings?.waitlist ?? {}) as WaitlistConfig;
		waitlistEnabled = w.enabled ?? false;
		cancellationHours = String(w.cancellation_deadline_hours ?? 24);
	});

	const HOUR_OPTIONS = [2, 4, 12, 24, 48];
	function hoursLabel(n: number): string {
		return `${n} ${n === 1 ? 'time' : 'timer'} før`;
	}

	// --- save ("Lagre endringer" — the single black primary) -----------------
	let saving = $state(false);
	async function saveAll() {
		saving = true;
		try {
			const opening_hours: OpeningHours = {};
			for (const d of days) {
				opening_hours[d.key] = d.closed ? null : { open: d.open, close: d.close };
			}

			// Owner update: send ONLY opening_hours (status/slug/modules/type are
			// rejected by the customer update rule).
			const tasks: Promise<unknown>[] = [
				pb.collection(Collections.Businesses).update(businessId, { opening_hours })
			];

			// booking_settings update: omit business (customer rule requires
			// business:isset=false). Only when a row exists.
			if (data.settings) {
				const reminders: Reminders = {
					sms: smsReminder,
					email: emailReminder,
					hours_before: Number(hoursBefore) || 24,
					follow_up: followUp
				};
				const deposit: Deposit = {
					enabled: depositEnabled,
					percent: Number(depositPercent) || 0,
					method: 'vipps',
					min_amount: Number(depositMinAmount) || 0
				};
				const waitlist: WaitlistConfig = {
					enabled: waitlistEnabled,
					cancellation_deadline_hours: Number(cancellationHours) || 24
				};
				tasks.push(
					pb
						.collection(Collections.BookingSettings)
						.update(data.settings.id, { reminders, deposit, waitlist })
				);
			}

			await Promise.all(tasks);
			toast.success('Innstillingene er lagret.');
			await invalidate('app:booking-settings');
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	function refresh() {
		return invalidate('app:booking-settings');
	}

	// --- resources -----------------------------------------------------------
	let resourceDrawerOpen = $state(false);
	let editingResource = $state<ResourceRow | null>(null);
	let confirmOpen = $state(false);
	let resourceToDelete = $state<ResourceRow | null>(null);

	function openNewResource() {
		editingResource = null;
		resourceDrawerOpen = true;
	}
	function openEditResource(r: ResourceRow) {
		editingResource = r;
		resourceDrawerOpen = true;
	}
	function askDeleteResource(r: ResourceRow) {
		resourceToDelete = r;
		confirmOpen = true;
	}
	async function deleteResource() {
		const r = resourceToDelete;
		if (!r) return;
		try {
			await pb.collection(Collections.Resources).delete(r.id);
			toast.success('Ressursen er slettet.');
			await refresh();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			resourceToDelete = null;
		}
	}

	const cardClass = 'flex flex-col gap-5 rounded-xl border border-border bg-card p-6';
	const cardTitle = 'text-lg font-semibold text-foreground';
	const switchRow = 'flex items-center gap-3';
	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Booking · Innstillinger · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="min-w-0">
		<h1 class="text-2xl font-semibold text-foreground">Booking</h1>
		<p class="mt-1 text-sm text-muted-foreground">Timene og avtalene for {businessName}.</p>
	</header>

	<!-- Faner: Kalender / Avtaler lever på /booking (klient-state), Innstillinger her -->
	<div class="flex gap-6 border-b border-border">
		<a
			href="/booking"
			class="relative -mb-px border-b-2 border-transparent px-1 pb-3 pt-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		>
			Kalender
		</a>
		<a
			href="/booking?fane=avtaler"
			class="relative -mb-px border-b-2 border-transparent px-1 pb-3 pt-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		>
			Avtaler
		</a>
		<span
			aria-current="page"
			class="relative -mb-px border-b-2 border-foreground px-1 pb-3 pt-1 text-sm font-medium text-foreground"
		>
			Innstillinger
		</span>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- ============ VENSTRE KOLONNE ============ -->
		<div class="flex flex-col gap-6">
			<!-- Åpningstider -->
			<section class={cardClass}>
				<h2 class={cardTitle}>Åpningstider</h2>
				<div class="flex flex-col gap-3">
					{#each days as day (day.key)}
						<div class="flex items-center gap-3">
							<span class="w-20 shrink-0 text-sm font-medium text-foreground">{day.label}</span>
							{#if day.closed}
								<span class="flex-1 text-sm text-muted-foreground">Stengt</span>
							{:else}
								<div class="flex flex-1 items-center gap-2">
									<Input
										type="time"
										aria-label="{day.label} åpner"
										bind:value={day.open}
										class="w-[110px]"
									/>
									<span class="text-muted-foreground">–</span>
									<Input
										type="time"
										aria-label="{day.label} stenger"
										bind:value={day.close}
										class="w-[110px]"
									/>
								</div>
							{/if}
							<Switch
								checked={!day.closed}
								onCheckedChange={(v) => (day.closed = !v)}
								aria-label="Åpent {day.label.toLowerCase()}"
							/>
						</div>
					{/each}
				</div>
			</section>

			<!-- Påminnelser -->
			<section class={cardClass}>
				<div class="flex items-center justify-between gap-3">
					<h2 class={cardTitle}>Påminnelser</h2>
					{#if !hasSettings}
						<span class="text-xs text-muted-foreground">Kan ikke endres</span>
					{/if}
				</div>
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between gap-3">
						<div class={switchRow}>
							<Switch
								bind:checked={smsReminder}
								disabled={!hasSettings}
								aria-label="SMS til kunden før timen"
							/>
							<span class="text-sm text-foreground">SMS til kunden før timen</span>
						</div>
						<Select.Root type="single" bind:value={hoursBefore} disabled={!hasSettings || !smsReminder}>
							<Select.Trigger class="w-[140px]" aria-label="Hvor lenge før">
								{hoursLabel(Number(hoursBefore) || 24)}
							</Select.Trigger>
							<Select.Content>
								{#each HOUR_OPTIONS as h (h)}
									<Select.Item value={String(h)} label={hoursLabel(h)}>{hoursLabel(h)}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class={switchRow}>
						<Switch
							bind:checked={emailReminder}
							disabled={!hasSettings}
							aria-label="E-postbekreftelse ved booking"
						/>
						<span class="text-sm text-foreground">E-postbekreftelse ved booking</span>
					</div>
					<div class={switchRow}>
						<Switch
							bind:checked={followUp}
							disabled={!hasSettings}
							aria-label="Oppfølging etter besøket"
						/>
						<span class="text-sm text-foreground">Oppfølging etter besøket</span>
					</div>
				</div>
			</section>
		</div>

		<!-- ============ HØYRE KOLONNE ============ -->
		<div class="flex flex-col gap-6">
			<!-- Betaling og depositum -->
			<section class={cardClass}>
				<div class="flex items-center justify-between gap-3">
					<h2 class={cardTitle}>Betaling og depositum</h2>
					{#if !hasSettings}
						<span class="text-xs text-muted-foreground">Kan ikke endres</span>
					{/if}
				</div>
				<div class={switchRow}>
					<Switch
						bind:checked={depositEnabled}
						disabled={!hasSettings}
						aria-label="Krev depositum ved booking"
					/>
					<span class="text-sm text-foreground">Krev depositum ved booking</span>
				</div>
				{#if depositEnabled}
					<div class="flex flex-col gap-4 border-t border-border pt-4">
						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label for="deposit-percent">Depositum</Field.Label>
								<div class="relative">
									<Input
										id="deposit-percent"
										type="number"
										min="0"
										max="100"
										bind:value={depositPercent}
										disabled={!hasSettings}
										class="pr-8"
									/>
									<span
										class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
										>%</span
									>
								</div>
							</Field.Field>
							<Field.Field>
								<Field.Label for="deposit-min">Minstebeløp</Field.Label>
								<div class="relative">
									<Input
										id="deposit-min"
										type="number"
										min="0"
										bind:value={depositMinAmount}
										disabled={!hasSettings}
										class="pr-10"
									/>
									<span
										class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
										>kr</span
									>
								</div>
							</Field.Field>
						</div>
						<Field.Field>
							<Field.Label for="deposit-method">Betalingsmetode</Field.Label>
							<div
								id="deposit-method"
								class="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground"
							>
								Vipps
							</div>
						</Field.Field>
						<p class="text-sm text-muted-foreground">
							Trekkes fra ved oppmøte. Betales med Vipps eller kort.
						</p>
					</div>
				{/if}
				<div class="flex items-start gap-2 text-sm text-muted-foreground">
					<Info class="mt-0.5 size-4 shrink-0" />
					<span>Betalingsleverandør settes opp under Innstillinger › Integrasjoner.</span>
				</div>
			</section>

			<!-- Venteliste og avbestilling -->
			<section class={cardClass}>
				<div class="flex items-center justify-between gap-3">
					<h2 class={cardTitle}>Venteliste og avbestilling</h2>
					{#if !hasSettings}
						<span class="text-xs text-muted-foreground">Kan ikke endres</span>
					{/if}
				</div>
				<div class={switchRow}>
					<Switch
						bind:checked={waitlistEnabled}
						disabled={!hasSettings}
						aria-label="Tilby venteliste når det er fullt"
					/>
					<span class="text-sm text-foreground">Tilby venteliste når det er fullt</span>
				</div>
				<Field.Field>
					<Field.Label for="cancellation">Gratis avbestilling inntil</Field.Label>
					<Select.Root type="single" bind:value={cancellationHours} disabled={!hasSettings}>
						<Select.Trigger id="cancellation" class="w-full">
							{hoursLabel(Number(cancellationHours) || 24)}
						</Select.Trigger>
						<Select.Content>
							{#each HOUR_OPTIONS as h (h)}
								<Select.Item value={String(h)} label={hoursLabel(h)}>{hoursLabel(h)}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
			</section>

			<!-- Ressurser -->
			<section class={cardClass}>
				<h2 class={cardTitle}>Ressurser</h2>
				{#if data.resources.length === 0}
					<EmptyState
						icon={Armchair}
						title="Ingen ressurser ennå"
						description="Legg til stoler, rom eller utstyr som kan bookes."
					/>
				{:else}
					<ul class="flex flex-col divide-y divide-border">
						{#each data.resources as r (r.id)}
							<li class="flex items-center justify-between gap-3 py-2 first:pt-0">
								<div class="flex min-w-0 items-center gap-2">
									<span class="truncate text-sm font-medium text-foreground">{r.name}</span>
									{#if r.expand?.staff}
										<span class="truncate text-sm text-muted-foreground"
											>— {r.expand.staff.name}</span
										>
									{/if}
									{#if !r.active}
										<span class="text-xs text-muted-foreground">· Inaktiv</span>
									{/if}
								</div>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {r.name}">
										<Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onSelect={() => openEditResource(r)}>Rediger</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive data-highlighted:text-destructive"
											onSelect={() => askDeleteResource(r)}
										>
											Slett
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</li>
						{/each}
					</ul>
				{/if}
				<div>
					<Button variant="outline" size="sm" onclick={openNewResource}>
						<Plus class="size-4" />
						Legg til ressurs
					</Button>
				</div>
			</section>
		</div>
	</div>

	<!-- Lagre-linje: den ENESTE svarte primærknappen på skjermen -->
	<div class="flex justify-end border-t border-border pt-6">
		<Button onclick={saveAll} disabled={saving}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	</div>
</div>

<ResourceDrawer
	bind:open={resourceDrawerOpen}
	resource={editingResource}
	staff={data.staff}
	{businessId}
	onsaved={refresh}
/>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Slette ressursen?"
	description={resourceToDelete
		? `«${resourceToDelete.name}» fjernes. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Slett"
	cancelLabel="Avbryt"
	destructive
	onconfirm={deleteResource}
/>
