<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { Collections, AiJobsIntervalOptions } from '$lib/pocketbase-types';
	import {
		JOB_TYPES,
		INTERVAL_OPTIONS,
		TIME_OPTIONS,
		jobTypeDescription,
		lastRunLabel,
		resultPill,
		type Tone
	} from './labels';
	import type { JobRow, RunRow, BusinessRow } from './+page';

	let {
		open = $bindable(false),
		job = null,
		businesses = [],
		recentRuns = [],
		businessNames = new Map<string, string>(),
		onsaved
	}: {
		open?: boolean;
		/** The job being edited, or `null` to configure a new one. */
		job?: JobRow | null;
		businesses?: BusinessRow[];
		/** Recent runs for the job being edited (read-only history). */
		recentRuns?: RunRow[];
		/** id → business name, for the run-history rows. */
		businessNames?: Map<string, string>;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(job));

	let type = $state<string>(JOB_TYPES[0].value);
	let businessIds = $state<string[]>([]);
	let interval = $state<string>(AiJobsIntervalOptions.weekly);
	let runAt = $state<string>('09:00');
	let emailOnFindings = $state(false);
	let showStatus = $state(false);
	let createTask = $state(false);
	let saving = $state(false);

	// Re-seed the form each time the drawer opens for a different job (or a fresh
	// create) so an in-progress edit is never clobbered by a re-render.
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = job?.id ?? 'new';
		if (key === lastKey) return;
		lastKey = key;

		type = job?.type ?? JOB_TYPES[0].value;
		businessIds = job ? [...(job.businesses ?? [])] : [];
		interval = job?.interval ?? AiJobsIntervalOptions.weekly;
		runAt = job?.run_at || '09:00';
		const n = job?.notifications ?? {};
		emailOnFindings = n.email_on_findings === true;
		showStatus = n.show_status_to_client === true;
		createTask = n.create_task === true;
	});

	const typeLabel = $derived(JOB_TYPES.find((t) => t.value === type)?.label ?? 'Velg type');
	const intervalDisplay = $derived(
		INTERVAL_OPTIONS.find((i) => i.value === interval)?.label ?? 'Velg intervall'
	);
	const isEvent = $derived(interval === AiJobsIntervalOptions.event);
	const allSelected = $derived(businesses.length > 0 && businessIds.length >= businesses.length);

	function toggleAll(on: boolean) {
		businessIds = on ? businesses.map((b) => b.id) : [];
	}
	function toggleBiz(id: string, on: boolean) {
		businessIds = on ? [...businessIds, id] : businessIds.filter((x) => x !== id);
	}

	const canSave = $derived(Boolean(type && businessIds.length > 0 && interval && !saving));

	const TONE_TEXT: Record<Tone, string> = {
		success: 'text-success',
		warning: 'text-warning',
		error: 'text-error',
		info: 'text-accent-blue-text',
		neutral: 'text-text-body'
	};

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = {
				type,
				businesses: businessIds,
				interval,
				run_at: isEvent ? '' : runAt,
				notifications: {
					email_on_findings: emailOnFindings,
					show_status_to_client: showStatus,
					create_task: createTask
				}
			};
			if (job) {
				await pb.collection(Collections.AiJobs).update(job.id, payload);
				toast.success('AI-jobben er oppdatert.');
			} else {
				await pb.collection(Collections.AiJobs).create({ ...payload, status: 'active' });
				toast.success('AI-jobben er opprettet.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre AI-jobben.');
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer
	bind:open
	title="Sett opp AI-jobb"
	description="Jobben kjører automatisk for de valgte bedriftene."
>
	<div class="flex flex-col gap-6">
		<!-- Jobbtype -->
		<div class="flex flex-col gap-1.5">
			<Label for="job-type">Jobbtype</Label>
			<Select.Root type="single" bind:value={type}>
				<Select.Trigger id="job-type" class="w-full">{typeLabel}</Select.Trigger>
				<Select.Content>
					{#each JOB_TYPES as t (t.value)}
						<Select.Item value={t.value} label={t.label}>{t.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<p class="text-sm text-muted-foreground">{jobTypeDescription(type)}</p>
		</div>

		<!-- Bedrift(er) -->
		<div class="flex flex-col gap-1.5">
			<Label>Bedrifter</Label>
			<div class="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
				<label for="job-biz-all" class="flex cursor-pointer items-center gap-3 px-3 py-2.5">
					<Checkbox
						id="job-biz-all"
						checked={allSelected}
						onCheckedChange={(v) => toggleAll(v === true)}
					/>
					<span class="min-w-0 flex-1 text-sm font-medium text-foreground">Alle bedrifter</span>
				</label>
				{#each businesses as b (b.id)}
					<label for="job-biz-{b.id}" class="flex cursor-pointer items-center gap-3 px-3 py-2.5">
						<Checkbox
							id="job-biz-{b.id}"
							checked={businessIds.includes(b.id)}
							onCheckedChange={(v) => toggleBiz(b.id, v === true)}
						/>
						<span class="min-w-0 flex-1 truncate text-sm text-foreground">{b.name}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Plan -->
		<div class="flex flex-col gap-4 border-t border-border pt-5">
			<p class={sectionLabel}>Plan</p>
			<div class="flex flex-col gap-1.5">
				<Label for="job-interval">Intervall</Label>
				<Select.Root type="single" bind:value={interval}>
					<Select.Trigger id="job-interval" class="w-full">{intervalDisplay}</Select.Trigger>
					<Select.Content>
						{#each INTERVAL_OPTIONS as i (i.value)}
							<Select.Item value={i.value} label={i.label}>{i.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			{#if !isEvent}
				<div class="flex flex-col gap-1.5">
					<Label for="job-time">Tidspunkt</Label>
					<Select.Root type="single" bind:value={runAt}>
						<Select.Trigger id="job-time" class="w-full">{runAt}</Select.Trigger>
						<Select.Content>
							{#each TIME_OPTIONS as t (t)}
								<Select.Item value={t} label={t}>{t}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					Hendelsesbaserte jobber kjører når noe skjer — for eksempel en ny anmeldelse.
				</p>
			{/if}
		</div>

		<!-- Varsling -->
		<div class="flex flex-col gap-3 border-t border-border pt-5">
			<p class={sectionLabel}>Varsling</p>
			<label for="job-email" class="flex cursor-pointer items-center gap-3 py-1">
				<span class="min-w-0 flex-1 text-sm text-foreground">E-post til byrået ved funn</span>
				<Switch id="job-email" bind:checked={emailOnFindings} />
			</label>
			<label for="job-showstatus" class="flex cursor-pointer items-center gap-3 py-1">
				<span class="min-w-0 flex-1 text-sm text-foreground">Vis status i kundens dashbord</span>
				<Switch id="job-showstatus" bind:checked={showStatus} />
			</label>
			<label for="job-task" class="flex cursor-pointer items-center gap-3 py-1">
				<span class="min-w-0 flex-1 text-sm text-foreground">Opprett oppgave automatisk ved funn</span>
				<Switch id="job-task" bind:checked={createTask} />
			</label>
		</div>

		<!-- Siste kjøringer (edit only, read-only) -->
		{#if editing}
			<div class="flex flex-col gap-2 border-t border-border pt-5">
				<p class={sectionLabel}>Siste kjøringer</p>
				{#if recentRuns.length === 0}
					<p class="text-sm text-muted-foreground">Ingen kjøringer ennå.</p>
				{:else}
					<ul class="flex flex-col divide-y divide-border rounded-lg border border-border">
						{#each recentRuns.slice(0, 5) as run (run.id)}
							{@const pill = resultPill(run)}
							<li class="flex items-center gap-3 px-3 py-2.5">
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm text-foreground">
										{businessNames.get(run.business) ?? 'Bedrift'}
									</span>
									<span class="block text-xs text-muted-foreground">{lastRunLabel(run.ran_at)}</span>
								</span>
								{#if pill}
									<span class="shrink-0 text-xs font-medium {TONE_TEXT[pill.tone]}">{pill.label}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave}>
			{saving ? 'Lagrer …' : 'Lagre jobb'}
		</Button>
	{/snippet}
</Drawer>
