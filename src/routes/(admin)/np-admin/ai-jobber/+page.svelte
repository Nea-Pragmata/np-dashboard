<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Zap from '@lucide/svelte/icons/zap';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import JobDrawer from './JobDrawer.svelte';
	import { pb } from '$lib/pb';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import { Collections, AiJobsStatusOptions } from '$lib/pocketbase-types';
	import {
		jobTypeLabel,
		intervalLabel,
		lastRunLabel,
		resultPill,
		businessesLabel,
		type Tone
	} from './labels';
	import type { TableState } from '$lib/types';
	import type { PageData } from './$types';
	import type { JobRow, RunRow } from './+page';

	let { data }: { data: PageData } = $props();

	const jobs = $derived(data.jobs);
	const totalBusinesses = $derived(data.businesses.length);
	const isOwner = $derived(auth.agencyMember?.role === 'owner');

	const businessNames = $derived(
		new Map<string, string>(data.businesses.map((b) => [b.id, b.name]))
	);

	// Runs grouped per job (load already sorts newest-first).
	const runsByJob = $derived.by(() => {
		const map = new Map<string, RunRow[]>();
		for (const r of data.runs) {
			const list = map.get(r.job) ?? [];
			list.push(r);
			map.set(r.job, list);
		}
		return map;
	});
	function latestRun(jobId: string): RunRow | null {
		return runsByJob.get(jobId)?.[0] ?? null;
	}

	// --- KPIs ----------------------------------------------------------------
	const activeCount = $derived(
		jobs.filter((j) => j.status === AiJobsStatusOptions.active).length
	);

	const runsLast7d = $derived.by(() => {
		const cutoff = Date.now() - 7 * 86_400_000;
		return data.runs.filter((r) => {
			const t = new Date(r.ran_at).getTime();
			return !Number.isNaN(t) && t >= cutoff;
		}).length;
	});

	// Jobs whose most recent run turned up something actionable.
	const findingsJobs = $derived(jobs.filter((j) => latestRun(j.id)?.result === 'findings'));
	const findingsCount = $derived(findingsJobs.length);
	const topFindingsNote = $derived.by(() => {
		const byBusiness = new Map<string, number>();
		for (const j of findingsJobs) {
			const run = latestRun(j.id);
			if (!run) continue;
			byBusiness.set(run.business, (byBusiness.get(run.business) ?? 0) + 1);
		}
		let top: { id: string; count: number } | null = null;
		for (const [id, count] of byBusiness) {
			if (!top || count > top.count) top = { id, count };
		}
		if (!top) return undefined;
		return `${top.count} hos ${businessNames.get(top.id) ?? 'bedrift'}`;
	});

	const coveredBusinesses = $derived.by(() => {
		const set = new Set<string>();
		for (const j of jobs) for (const id of j.businesses ?? []) set.add(id);
		return set.size;
	});

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/np-admin/ai-jobber'
	);
	const tableState = $derived<TableState<JobRow>>({
		status: isLoading ? 'loading' : 'ready',
		items: jobs
	});

	function refresh() {
		return invalidateAll();
	}

	// --- drawer + actions ----------------------------------------------------
	let drawerOpen = $state(false);
	let editingJob = $state<JobRow | null>(null);

	function openCreate() {
		editingJob = null;
		drawerOpen = true;
	}
	function openEdit(job: JobRow) {
		editingJob = job;
		drawerOpen = true;
	}

	async function toggleStatus(job: JobRow) {
		const next =
			job.status === AiJobsStatusOptions.active
				? AiJobsStatusOptions.paused
				: AiJobsStatusOptions.active;
		try {
			await pb.collection(Collections.AiJobs).update(job.id, { status: next });
			toast.success(next === AiJobsStatusOptions.paused ? 'Jobben er satt på pause.' : 'Jobben er aktivert.');
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke endre status.');
		}
	}

	let confirmOpen = $state(false);
	let toDelete = $state<JobRow | null>(null);
	function askDelete(job: JobRow) {
		toDelete = job;
		confirmOpen = true;
	}
	async function doDelete() {
		const job = toDelete;
		if (!job) return;
		try {
			await pb.collection(Collections.AiJobs).delete(job.id);
			toast.success('AI-jobben er slettet.');
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke slette AI-jobben.');
		}
	}

	const TONE_TEXT: Record<Tone, string> = {
		success: 'text-success',
		warning: 'text-warning',
		error: 'text-error',
		info: 'text-accent-blue-text',
		neutral: 'text-text-body'
	};

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>AI-jobber · NP Admin</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">AI-jobber</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Automatiske jobber som kjører for kundene dine — med fast intervall.
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			Ny AI-jobb
		</Button>
	</header>

	<!-- Nøkkeltall -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<KpiCard label="Aktive jobber" value={activeCount} />
		<KpiCard label="Kjøringer siste 7 dager" value={runsLast7d} />
		<KpiCard
			label="Funn som krever handling"
			value={findingsCount}
			trend={topFindingsNote ? { direction: 'neutral', delta: topFindingsNote } : undefined}
		/>
		<KpiCard label="Bedrifter dekket" value={coveredBusinesses} />
	</div>

	<!-- Jobber -->
	<section class="flex flex-col gap-3">
		<h2 class="text-base font-semibold text-foreground">Jobber</h2>
		<DataTable
			state={tableState}
			columns={7}
			onRetry={refresh}
			empty={{
				icon: Zap,
				title: 'Ingen AI-jobber ennå',
				description: 'Sett opp den første jobben, så kjører den automatisk for kundene.'
			}}
		>
			{#snippet header()}
				<th>Jobb</th>
				<th class="w-[160px]">Bedrift</th>
				<th class="w-[170px]">Intervall</th>
				<th class="w-[150px]">Siste kjøring</th>
				<th class="w-[190px]">Resultat</th>
				<th class="w-[110px]">Status</th>
				<th class="w-[56px]"><span class="sr-only">Handlinger</span></th>
			{/snippet}
			{#snippet row(job)}
				{@const latest = latestRun(job.id)}
				{@const pill = resultPill(latest)}
				<td>
					<button
						type="button"
						onclick={() => openEdit(job)}
						class="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-text-subtle"
							aria-hidden="true"
						>
							<Zap class="size-4" />
						</span>
						<span class="font-medium text-foreground">{jobTypeLabel(job.type)}</span>
					</button>
				</td>
				<td class="text-text-body">{businessesLabel(job, totalBusinesses)}</td>
				<td class="text-text-body">{intervalLabel(job.interval, job.run_at)}</td>
				<td class="text-text-body">{lastRunLabel(latest?.ran_at)}</td>
				<td>
					{#if pill}
						<span class="inline-flex items-center gap-1.5 text-sm font-medium {TONE_TEXT[pill.tone]}">
							<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"></span>
							{pill.label}
						</span>
					{:else}
						<span class="text-text-subtle">—</span>
					{/if}
				</td>
				<td><StatusBadge collection="ai_jobs" status={job.status} /></td>
				<td>
					<div class="flex justify-end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {jobTypeLabel(job.type)}">
								<Ellipsis class="size-4" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Item onSelect={() => openEdit(job)}>Sett opp</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={() => toggleStatus(job)}>
									{job.status === AiJobsStatusOptions.active ? 'Sett på pause' : 'Aktiver'}
								</DropdownMenu.Item>
								{#if isOwner}
									<DropdownMenu.Item variant="destructive" onSelect={() => askDelete(job)}>
										Slett
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</td>
			{/snippet}
		</DataTable>
		<p class="text-xs text-muted-foreground">
			Resultater som krever handling dukker opp i kundens dashbord som status — aldri som verktøy.
		</p>
	</section>
</div>

<JobDrawer
	bind:open={drawerOpen}
	job={editingJob}
	businesses={data.businesses}
	recentRuns={editingJob ? (runsByJob.get(editingJob.id) ?? []) : []}
	{businessNames}
	onsaved={refresh}
/>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Slette AI-jobben?"
	description={toDelete ? `«${jobTypeLabel(toDelete.type)}» slettes for godt.` : undefined}
	confirmLabel="Slett"
	destructive
	onconfirm={doDelete}
/>
