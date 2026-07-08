<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Clock from '@lucide/svelte/icons/clock';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import {
		hostingPill,
		sslPill,
		backupPill,
		seoPill,
		isUrgent,
		formatUptime,
		shortDate,
		type Pill,
		type Tone
	} from './status';
	import { AgencyTasksStatusOptions } from '$lib/pocketbase-types';
	import type { TableState } from '$lib/types';
	import type { PageData } from './$types';
	import type { SiteStatusRow, TaskRow } from './+page';

	let { data }: { data: PageData } = $props();

	const siteStatus = $derived(
		[...data.siteStatus].sort((a, b) =>
			(a.expand?.business?.name ?? '').localeCompare(b.expand?.business?.name ?? '', 'nb')
		)
	);
	const tasks = $derived(data.tasks);

	// --- KPIs ----------------------------------------------------------------
	const uptimes = $derived(
		siteStatus.map((r) => r.uptime).filter((u): u is number => typeof u === 'number')
	);
	const openCount = $derived(
		tasks.filter((t) => t.status === AgencyTasksStatusOptions.open).length
	);
	const urgentCount = $derived(tasks.filter((t) => isUrgent(t.status, t.due_date)).length);
	const total = $derived(siteStatus.length);
	const sslOk = $derived(siteStatus.filter((r) => r.ssl_status === 'ok').length);
	const backupOk = $derived(siteStatus.filter((r) => Boolean(r.last_backup)).length);

	// --- tasks ordering ------------------------------------------------------
	const sortedTasks = $derived.by(() => {
		const open = tasks
			.filter((t) => t.status === AgencyTasksStatusOptions.open)
			.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
		const done = tasks
			.filter((t) => t.status !== AgencyTasksStatusOptions.open)
			.sort((a, b) => (b.due_date ?? '').localeCompare(a.due_date ?? ''));
		return [...open, ...done];
	});

	function taskTitle(t: TaskRow): string {
		const name = t.expand?.business?.name;
		return name ? `${t.text} — ${name}` : t.text;
	}

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/np-admin/drift'
	);
	const tableState = $derived<TableState<SiteStatusRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: siteStatus
	});

	function refresh() {
		return invalidateAll();
	}

	const PILL_TEXT: Record<Tone, string> = {
		success: 'text-success',
		warning: 'text-warning',
		error: 'text-error',
		info: 'text-accent-blue-text',
		neutral: 'text-text-body'
	};
</script>

<svelte:head><title>Drift & status · NP Admin</title></svelte:head>

{#snippet statusPill(info: Pill)}
	{#if info}
		<span class="inline-flex items-center gap-1.5 text-sm font-medium {PILL_TEXT[info.tone]}">
			<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"></span>
			{info.label}
		</span>
	{:else}
		<span class="text-text-subtle">—</span>
	{/if}
{/snippet}

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="min-w-0">
		<h1 class="text-2xl font-semibold text-foreground">Drift &amp; status</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Hosting, domener og løpende arbeid — alt byrået drifter.
		</p>
	</header>

	<!-- Nøkkeltall -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<KpiCard label="Oppetid siste 30 dager" value={formatUptime(uptimes)} />
		<KpiCard
			label="Åpne driftssaker"
			value={openCount}
			trend={urgentCount > 0
				? { direction: 'neutral', delta: `${urgentCount} haster` }
				: undefined}
		/>
		<KpiCard label="Gyldige SSL" value={`${sslOk} av ${total}`} />
		<KpiCard label="Sikkerhetskopier" value={`${backupOk} av ${total}`} />
	</div>

	<!-- Status per bedrift -->
	<section class="flex flex-col gap-3">
		<h2 class="text-base font-semibold text-foreground">Status per bedrift</h2>
		<DataTable
			state={tableState}
			columns={5}
			onRetry={refresh}
			empty={{
				icon: ClipboardList,
				title: 'Ingen driftsdata ennå',
				description: 'Statuslinjer dukker opp når nettsidene er satt opp.'
			}}
		>
			{#snippet header()}
				<th>Bedrift</th>
				<th class="w-[150px]">Hosting</th>
				<th class="w-[150px]">SSL</th>
				<th class="w-[170px]">Sikkerhetskopi</th>
				<th class="w-[190px]">SEO-gjennomgang</th>
			{/snippet}
			{#snippet row(r)}
				<td class="font-medium text-foreground">{r.expand?.business?.name ?? '—'}</td>
				<td>{@render statusPill(hostingPill(r.expand?.business?.status ?? ''))}</td>
				<td>{@render statusPill(sslPill(r.ssl_status))}</td>
				<td>{@render statusPill(backupPill(r.last_backup))}</td>
				<td>{@render statusPill(seoPill(r.seo_review_date))}</td>
			{/snippet}
		</DataTable>
	</section>

	<!-- Oppgaver -->
	<section class="flex flex-col gap-3">
		<h2 class="text-base font-semibold text-foreground">Oppgaver</h2>
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			{#if sortedTasks.length === 0}
				<EmptyState
					icon={ClipboardList}
					title="Ingen oppgaver"
					description="Alt er gjort — ingen åpne driftssaker akkurat nå."
					class="py-10"
				/>
			{:else}
				<ul class="divide-y divide-border">
					{#each sortedTasks as t (t.id)}
						{@const open = t.status === AgencyTasksStatusOptions.open}
						<li class="flex items-center gap-3 px-4 py-3.5">
							{#if open}
								<Clock class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
							{:else}
								<CheckCircle2 class="size-4 shrink-0 text-success" aria-hidden="true" />
							{/if}
							<span class="min-w-0 flex-1 truncate text-sm text-foreground">{taskTitle(t)}</span>
							{#if t.due_date}
								<span class="hidden shrink-0 text-xs text-muted-foreground sm:inline">
									{open ? `Frist ${shortDate(t.due_date)}` : shortDate(t.due_date)}
								</span>
							{/if}
							<StatusBadge collection="agency_tasks" status={t.status} />
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</div>
