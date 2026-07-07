<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Download from '@lucide/svelte/icons/download';
	import Send from '@lucide/svelte/icons/send';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Compass from '@lucide/svelte/icons/compass';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Info from '@lucide/svelte/icons/info';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import { formatNumber } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Select from '$lib/components/ui/select';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import MonoBarChart from '$lib/components/charts/MonoBarChart.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const modules = $derived(data.modules);
	const stats = $derived(data.stats);

	const isLoading = $derived(!!navigating.to && navigating.to.url.pathname === '/statistikk');

	// KPI row — Besøk + Klikk are website metrics shown to every tenant; Bookinger
	// / Henvendelser only when their module is on. No trend deltas: stats_overview
	// has no previous-period data, so we never fabricate a "+12 %" (see LEDGER).
	const kpis = $derived(
		[
			{ label: 'Besøk', value: stats?.visits_30d ?? 0, show: true },
			{ label: 'Bookinger', value: stats?.bookings_30d ?? 0, show: Boolean(modules.booking) },
			{ label: 'Henvendelser', value: stats?.new_inquiries ?? 0, show: Boolean(modules.inquiries) },
			{ label: 'Klikk på lenker', value: stats?.clicks_30d ?? 0, show: true }
		].filter((k) => k.show)
	);

	// --- Besøk over tid: Dag / Uke views over the same 30-day series ---
	let viewMode = $state<'day' | 'week'>('day');

	function argmaxIndex(pts: { value: number }[]): number {
		let idx = -1;
		let best = 0;
		pts.forEach((p, i) => {
			if (p.value > best) {
				best = p.value;
				idx = i;
			}
		});
		return idx;
	}

	// Weekly view sums the daily buckets into 7-day chunks.
	const weekly = $derived.by(() => {
		const out: { label: string; value: number }[] = [];
		for (let i = 0; i < data.daily.length; i += 7) {
			const slice = data.daily.slice(i, i + 7);
			out.push({
				label: slice[0]?.label ?? '',
				value: slice.reduce((s, p) => s + p.value, 0)
			});
		}
		return out;
	});

	const chart = $derived(
		viewMode === 'week' ? weekly : data.daily.map((d) => ({ label: d.label, value: d.value }))
	);
	const chartPeak = $derived(argmaxIndex(chart));

	// Horizontal-bar rows scale to the largest value in their own list.
	const sourcesMax = $derived(Math.max(1, ...data.sources.map((s) => s.count)));
	const services = $derived(data.topServices ?? []);
	const servicesMax = $derived(Math.max(1, ...services.map((s) => s.count)));

	// --- Automatiske rapporter (report_settings) ---
	const FREQ_LABEL: Record<'weekly' | 'monthly', string> = {
		weekly: 'Ukentlig',
		monthly: 'Månedlig'
	};
	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	let rsEnabled = $state(false);
	let rsFrequency = $state<'weekly' | 'monthly'>('monthly');
	let rsEmail = $state('');
	let saving = $state(false);

	// Re-seed the editable copy whenever a fresh row loads (tenant switch / save).
	// Reads only `data.reportSettings`; writes the form state → no reactive loop.
	$effect(() => {
		const rs = data.reportSettings;
		rsEnabled = rs?.enabled ?? false;
		rsFrequency = (rs?.frequency as 'weekly' | 'monthly') ?? 'monthly';
		rsEmail = rs?.recipient_email ?? '';
	});

	const rs = $derived(data.reportSettings);
	const emailValid = $derived.by(() => {
		const v = rsEmail.trim();
		if (rsEnabled && v === '') return false;
		return v === '' || EMAIL_RE.test(v);
	});
	const dirty = $derived(
		!!rs &&
			(rsEnabled !== (rs.enabled ?? false) ||
				rsFrequency !== (rs.frequency ?? 'monthly') ||
				rsEmail.trim() !== (rs.recipient_email ?? ''))
	);

	const reportDescription = $derived.by(() => {
		const when = rsFrequency === 'weekly' ? 'hver mandag' : 'den 1. hver måned';
		const to = rsEmail.trim() ? rsEmail.trim() : 'en valgt mottaker';
		return `Sendes ${when} til ${to} med besøk, bookinger og kilder.`;
	});

	async function saveReport() {
		if (!rs || !dirty || !emailValid) return;
		saving = true;
		try {
			// Owner update rule requires the `business` field to be omitted.
			await pb.collection(Collections.ReportSettings).update(rs.id, {
				enabled: rsEnabled,
				frequency: rsFrequency,
				recipient_email: rsEmail.trim()
			});
			toast.success('Rapportinnstillingene er lagret.');
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Statistikk · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	{#if isLoading}
		<!-- Loading skeleton -->
		<div class="flex flex-col gap-2">
			<Skeleton class="h-8 w-48" />
			<Skeleton class="h-4 w-72" />
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each Array(4) as _, i (i)}
				<Skeleton class="h-[120px] rounded-lg" />
			{/each}
		</div>
		<Skeleton class="h-[340px] rounded-lg" />
		<div class="grid gap-6 lg:grid-cols-2">
			<Skeleton class="h-64 rounded-lg" />
			<Skeleton class="h-64 rounded-lg" />
		</div>
	{:else}
		<!-- Sidetopp -->
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0">
				<h1 class="text-2xl font-semibold text-foreground">Statistikk</h1>
				<p class="mt-1 text-sm text-muted-foreground">Trafikk, bookinger og kilder — hele bildet.</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<span
					class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-text-body"
				>
					<Calendar class="size-4 text-text-subtle" />
					Siste 30 dager
				</span>
				<Button
					variant="outline"
					onclick={() => toast.info('Nedlasting av rapport kommer snart.')}
				>
					<Download class="size-4" />
					Last ned rapport
				</Button>
			</div>
		</header>

		<!-- KPI-rekke -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each kpis as kpi (kpi.label)}
				<KpiCard label={kpi.label} value={kpi.value} />
			{/each}
		</div>

		<!-- Besøk over tid -->
		<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
			<div class="flex items-center justify-between gap-4">
				<h2 class="text-base font-semibold text-foreground">Besøk over tid</h2>
				<div
					class="flex items-center gap-1 rounded-md bg-muted p-0.5"
					role="group"
					aria-label="Velg visning"
				>
					<button
						type="button"
						aria-pressed={viewMode === 'day'}
						onclick={() => (viewMode = 'day')}
						class="rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {viewMode ===
						'day'
							? 'bg-card text-foreground shadow-none'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Dag
					</button>
					<button
						type="button"
						aria-pressed={viewMode === 'week'}
						onclick={() => (viewMode = 'week')}
						class="rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {viewMode ===
						'week'
							? 'bg-card text-foreground shadow-none'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Uke
					</button>
				</div>
			</div>
			{#if data.totalVisits > 0}
				<MonoBarChart data={chart} markedIndex={chartPeak} valueSuffix=" besøk" height={240} />
			{:else}
				<EmptyState
					icon={ChartColumn}
					title="Ingen besøksdata ennå"
					description="Så snart nettsiden får trafikk, ser du besøkene dine her — dag for dag."
				/>
			{/if}
		</section>

		<!-- Kilder og tjenester -->
		<div class="grid gap-6 {services.length > 0 ? 'lg:grid-cols-2' : ''}">
			<!-- Hvor kommer besøkende fra -->
			<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
				<h2 class="text-base font-semibold text-foreground">Hvor kommer besøkende fra</h2>
				{#if data.sources.length > 0}
					<div class="flex flex-col gap-1">
						{#each data.sources as s (s.label)}
							{@render distRow(s.label, (s.count / sourcesMax) * 100, `${s.pct} %`)}
						{/each}
					</div>
				{:else}
					<EmptyState
						icon={Compass}
						title="Ingen kilder ennå"
						description="Vi viser hvor besøkende kommer fra så snart nettsiden får trafikk."
					/>
				{/if}
			</section>

			<!-- Mest bookede tjenester -->
			{#if services.length > 0}
				<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
					<h2 class="text-base font-semibold text-foreground">Mest bookede tjenester</h2>
					<div class="flex flex-col gap-1">
						{#each services as svc (svc.label)}
							{@render distRow(svc.label, (svc.count / servicesMax) * 100, formatNumber(svc.count))}
						{/each}
					</div>
				</section>
			{:else if modules.booking}
				<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
					<h2 class="text-base font-semibold text-foreground">Mest bookede tjenester</h2>
					<EmptyState
						icon={CalendarClock}
						title="Ingen bookinger ennå"
						description="Når kundene begynner å booke, ser du de mest populære tjenestene her."
					/>
				</section>
			{/if}
		</div>

		<!-- Automatiske rapporter -->
		<section class="rounded-lg border border-border bg-card p-6">
			{#if rs}
				<div class="flex flex-col gap-5">
					<div class="flex flex-wrap items-start gap-4">
						<Switch bind:checked={rsEnabled} aria-label="Slå automatiske rapporter av eller på" />
						<div class="min-w-0 flex-1">
							<h2 class="text-sm font-medium text-foreground">
								{rsFrequency === 'weekly' ? 'Ukesrapport' : 'Månedsrapport'} på e-post
							</h2>
							<p class="mt-0.5 text-xs text-muted-foreground">{reportDescription}</p>
						</div>
						<Button
							variant="ghost"
							onclick={() => toast.info('Sending av testrapport kommer snart.')}
						>
							<Send class="size-4" />
							Send testrapport
						</Button>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-2">
							<Label for="rs-frequency">Hvor ofte</Label>
							<Select.Root
								type="single"
								value={rsFrequency}
								onValueChange={(v) => (rsFrequency = v as 'weekly' | 'monthly')}
							>
								<Select.Trigger id="rs-frequency" class="w-full">
									{FREQ_LABEL[rsFrequency]}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="monthly" label="Månedlig">Månedlig</Select.Item>
									<Select.Item value="weekly" label="Ukentlig">Ukentlig</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="rs-email">Mottaker (e-post)</Label>
							<Input
								id="rs-email"
								name="rs-email"
								type="email"
								placeholder="post@bedrift.no"
								bind:value={rsEmail}
								aria-invalid={!emailValid}
							/>
							{#if !emailValid}
								<p class="text-xs text-error">Skriv inn en gyldig e-postadresse.</p>
							{/if}
						</div>
					</div>

					<div class="flex justify-end">
						<Button size="lg" onclick={saveReport} disabled={!dirty || !emailValid || saving}>
							{saving ? 'Lagrer …' : 'Lagre endringer'}
						</Button>
					</div>
				</div>
			{:else}
				<!-- No report_settings row: create is agency-only, so we can't set it up
				     from here. Show an honest notice rather than a forbidden create. -->
				<div class="flex items-start gap-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-text-subtle">
						<Info class="size-4" />
					</span>
					<div class="min-w-0">
						<h2 class="text-sm font-medium text-foreground">Automatiske rapporter</h2>
						<p class="mt-0.5 text-sm text-muted-foreground">
							Automatisk e-postrapport er ikke satt opp for {data.business?.name ?? 'bedriften'} ennå.
							Ta kontakt med NP, så aktiverer vi det for deg.
						</p>
					</div>
				</div>
			{/if}
		</section>
	{/if}
</div>

{#snippet distRow(label: string, fillPct: number, valueText: string)}
	<div class="flex h-8 items-center gap-3">
		<span class="w-28 shrink-0 truncate text-sm text-text-body sm:w-32">{label}</span>
		<div class="h-2 min-w-0 flex-1 overflow-hidden rounded bg-muted">
			<div
				class="h-2 rounded bg-foreground"
				style="width: {Math.max(fillPct > 0 ? 2 : 0, Math.min(100, fillPct))}%"
			></div>
		</div>
		<span class="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-foreground"
			>{valueText}</span
		>
	</div>
{/snippet}
