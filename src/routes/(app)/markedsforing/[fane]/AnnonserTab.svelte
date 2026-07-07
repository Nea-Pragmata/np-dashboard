<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import BarChart3 from '@lucide/svelte/icons/chart-column';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { formatDayMonth, type AdStatusRow } from '../marketing';

	let { adStatuses }: { adStatuses: AdStatusRow[] } = $props();

	// The two ad networks NP runs. We always show both rows so a customer can see
	// at a glance which one is live — a missing view row means "not connected".
	const PROVIDERS = [
		{ key: 'meta', label: 'Meta', hint: 'Facebook og Instagram', icon: Megaphone },
		{ key: 'google', label: 'Google', hint: 'Søk og display', icon: BarChart3 }
	] as const;

	const rows = $derived(
		PROVIDERS.map((p) => {
			const row = adStatuses.find((a) => a.provider === p.key);
			return { ...p, status: row?.status ?? 'not_connected', updated: row?.updated ?? '' };
		})
	);
</script>

<div class="flex flex-col gap-6">
	<!-- Byrå-banner: ads are agency-run, this view is read-only for the customer. -->
	<div class="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
		<span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-blue-bg text-accent-blue-text">
			<Info class="size-4" />
		</span>
		<p class="text-sm text-muted-foreground">
			Annonsedrift styres av NP. Annonsene planlegges og driftes av byrået – her ser du status og
			resultater. Vil du endre noe? <span class="font-medium text-foreground">Ta kontakt.</span>
		</p>
	</div>

	<!-- Tilkoblede annonsekontoer (real data from integration_status) -->
	<section class="overflow-hidden rounded-lg border border-border bg-card">
		<div class="border-b border-border px-6 py-5">
			<h3 class="text-base font-semibold text-foreground">Annonsekontoer</h3>
			<p class="mt-1 text-sm text-muted-foreground">Tilkobling til annonsenettverkene byrået bruker.</p>
		</div>
		<ul>
			{#each rows as r (r.key)}
				<li class="flex items-center gap-4 border-b border-border px-6 py-4 last:border-b-0">
					<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-text-subtle">
						<r.icon class="size-5" />
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium text-foreground">{r.label}</p>
						<p class="text-xs text-muted-foreground">{r.hint}</p>
					</div>
					{#if r.updated}
						<span class="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
							Oppdatert {formatDayMonth(r.updated)}
						</span>
					{/if}
					<StatusBadge collection="integrations" status={r.status} />
				</li>
			{/each}
		</ul>
	</section>

	<!-- Results/budget: no ad-metrics data model exists, so we show an honest
	     placeholder instead of fabricated figures. -->
	<section class="rounded-lg border border-border bg-card">
		<div class="border-b border-border px-6 py-5">
			<h3 class="text-base font-semibold text-foreground">Resultater og budsjett</h3>
		</div>
		<EmptyState
			icon={BarChart3}
			title="Ingen resultater å vise ennå"
			description="Byrået fører inn visninger, klikk og budsjettbruk her når annonsene er i gang."
			class="py-12"
		/>
	</section>
</div>
