<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidateAll, replaceState } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import FileText from '@lucide/svelte/icons/file-text';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Mail from '@lucide/svelte/icons/mail';
	import Inbox from '@lucide/svelte/icons/inbox';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Check from '@lucide/svelte/icons/check';
	import Send from '@lucide/svelte/icons/send';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import StatusBadge, { statusMeta } from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { pb } from '$lib/pb';
	import {
		Collections,
		InquiriesStatusOptions,
		type InquiriesSourceOptions,
		type InquiriesStatusOptions as StatusValue
	} from '$lib/pocketbase-types';
	import { relativeTime, formatDate, formatTime, initials } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import type { PageData } from './$types';
	import type { InquiryRow } from './+page';

	let { data }: { data: PageData } = $props();

	const inquiries = $derived(data.inquiries);
	const businessId = $derived(data.business?.id ?? '');

	// --- channel (source) presentation ---------------------------------------
	const CHANNEL: Record<InquiriesSourceOptions, { icon: typeof Mail; label: string }> = {
		form: { icon: FileText, label: 'via skjema på nettsiden' },
		chat: { icon: MessageSquare, label: 'via chat' },
		email: { icon: Mail, label: 'via e-post' }
	};
	function channel(source: InquiriesSourceOptions) {
		return CHANNEL[source] ?? CHANNEL.form;
	}

	// Solid status dot in the list — colour follows the StatusBadge tone map.
	const TONE_DOT: Record<string, string> = {
		info: 'bg-accent-blue',
		warning: 'bg-warning',
		success: 'bg-success',
		error: 'bg-error',
		neutral: 'bg-text-subtle'
	};
	function statusDot(status: string) {
		return TONE_DOT[statusMeta('inquiries', status).tone] ?? TONE_DOT.neutral;
	}

	// --- tabs / status filter ------------------------------------------------
	type Tab = 'all' | StatusValue;
	const VALID_TABS: Tab[] = ['all', 'new', 'in_progress', 'done'];

	function initialTab(): Tab {
		// Read the ?status= filter once from the current URL on mount (browser only).
		if (typeof window !== 'undefined') {
			const param = new URLSearchParams(window.location.search).get('status') ?? '';
			if (VALID_TABS.includes(param as Tab)) return param as Tab;
		}
		return 'all';
	}
	let activeTab = $state<Tab>(initialTab());

	const counts = $derived.by(() => {
		const c = { all: inquiries.length, new: 0, in_progress: 0, done: 0 };
		for (const i of inquiries) c[i.status] += 1;
		return c;
	});
	const TABS = $derived<{ value: Tab; label: string; count: number }[]>([
		{ value: 'all', label: 'Alle', count: counts.all },
		{ value: 'new', label: 'Nye', count: counts.new },
		{ value: 'in_progress', label: 'Under arbeid', count: counts.in_progress },
		{ value: 'done', label: 'Fullført', count: counts.done }
	]);

	function selectTab(tab: Tab) {
		activeTab = tab;
		// Shareable filter without re-running load (shallow routing).
		const url = tab === 'all' ? '/henvendelser' : `/henvendelser?status=${tab}`;
		try {
			replaceState(url, {});
		} catch {
			// replaceState is browser/router-only; ignore if unavailable.
		}
	}

	const filtered = $derived(
		activeTab === 'all' ? inquiries : inquiries.filter((i) => i.status === activeTab)
	);

	// --- selection + responsive master/detail --------------------------------
	let selectedId = $state<string | null>(null);
	// On mobile the detail replaces the list; desktop always shows both.
	let mobileDetailOpen = $state(false);

	const selected = $derived(filtered.find((i) => i.id === selectedId) ?? null);

	// Keep a valid selection so the desktop detail pane mirrors Figma (first row
	// selected). Does not open the mobile detail — that needs an explicit tap.
	$effect(() => {
		if (!selected && filtered.length > 0) {
			selectedId = filtered[0].id;
		}
	});

	function selectInquiry(inq: InquiryRow) {
		selectedId = inq.id;
		mobileDetailOpen = true;
		reply = '';
	}
	function backToList() {
		mobileDetailOpen = false;
	}

	// --- loading -------------------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/henvendelser'
	);
	const skeletonRows = Array.from({ length: 6 }, (_, i) => i);

	// --- realtime ------------------------------------------------------------
	// Re-run this load AND the (app) layout (badge) on any inquiry change for the
	// active tenant. Re-subscribes when the business id changes.
	$effect(() => {
		const bid = businessId;
		if (!bid) return;
		let active = true;
		let unsub: (() => void) | undefined;
		pb.collection(Collections.Inquiries)
			.subscribe(
				'*',
				() => {
					if (active) invalidateAll();
				},
				{ filter: `business = "${bid}"` }
			)
			.then((u) => {
				if (active) unsub = u;
				else u();
			})
			.catch(() => {
				// Ignore subscribe failures (e.g. aborted on fast teardown).
			});
		return () => {
			active = false;
			unsub?.();
		};
	});

	// --- status mutations (EB rule — never send `business`) -------------------
	const STATUS_ACTIONS: { value: StatusValue; label: string; toast: string }[] = [
		{ value: 'new', label: 'Marker som ny', toast: 'Henvendelsen er merket som ny.' },
		{
			value: 'in_progress',
			label: 'Marker som under arbeid',
			toast: 'Henvendelsen er merket som under arbeid.'
		},
		{ value: 'done', label: 'Marker som fullført', toast: 'Henvendelsen er merket som fullført.' }
	];

	async function changeStatus(inq: InquiryRow, status: StatusValue, message: string) {
		if (inq.status === status) return;
		try {
			await pb.collection(Collections.Inquiries).update(inq.id, { status });
			toast.success(message);
			// invalidateAll refreshes the list AND the app-shell «Henvendelser»
			// badge (its count re-runs when the layout load re-runs).
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	// --- reply composer ------------------------------------------------------
	// There is no reply storage and email/SMS delivery is a deferred server hook,
	// so the composer is honest: «Send svar» hands the drafted text to the user's
	// own e-post client (mailto) and marks a new inquiry as under arbeid. It never
	// fabricates a stored/sent reply.
	let reply = $state('');

	function firstName(name: string): string {
		return name.trim().split(/\s+/)[0] || name;
	}

	async function sendReply(inq: InquiryRow) {
		const body = reply.trim();
		if (!body) {
			toast.error('Skriv en melding før du sender.');
			return;
		}
		const subject = encodeURIComponent('Svar på din henvendelse');
		window.location.href = `mailto:${inq.email}?subject=${subject}&body=${encodeURIComponent(body)}`;
		try {
			if (inq.status === InquiriesStatusOptions.new) {
				await pb.collection(Collections.Inquiries).update(inq.id, {
					status: InquiriesStatusOptions.in_progress
				});
				await invalidateAll();
				toast.success('Svaret åpnes i e-postklienten din. Henvendelsen er merket som under arbeid.');
			} else {
				toast.success('Svaret åpnes i e-postklienten din.');
			}
			reply = '';
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	const statusTriggerClass =
		'inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Henvendelser · NP Dashboard</title></svelte:head>

<div class="flex h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="shrink-0">
		<h1 class="text-2xl font-semibold text-foreground">Henvendelser</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Alt kundene sender inn — skjema, chat og tilbudsforespørsler.
		</p>
	</header>

	<!-- Faner / statusfilter -->
	<div class="flex shrink-0 gap-6 overflow-x-auto border-b border-border" role="tablist" aria-label="Filtrer henvendelser">
		{#each TABS as t (t.value)}
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === t.value}
				onclick={() => selectTab(t.value)}
				class={cn(
					'relative -mb-px whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
					activeTab === t.value
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}
			>
				{t.label} ({t.count})
			</button>
		{/each}
	</div>

	<!-- Hovedrad: liste + detalj -->
	<div class="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
		<!-- Listekort -->
		<div
			class={cn(
				'min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:w-[400px] lg:shrink-0',
				mobileDetailOpen ? 'hidden lg:flex' : 'flex'
			)}
		>
			{#if isLoading}
				<div class="flex flex-col">
					{#each skeletonRows as r (r)}
						<div class="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
							<Skeleton class="size-6 shrink-0 rounded-full" />
							<div class="flex min-w-0 flex-1 flex-col gap-1.5">
								<Skeleton class="h-3.5 w-32" />
								<Skeleton class="h-3 w-full max-w-[200px]" />
							</div>
							<Skeleton class="h-3 w-10 shrink-0" />
						</div>
					{/each}
				</div>
			{:else if filtered.length === 0}
				<div class="flex flex-1 items-center justify-center">
					{#if inquiries.length === 0}
						<EmptyState
							icon={Inbox}
							title="Ingen henvendelser ennå"
							description="Når noen sender inn skjema eller chat fra nettsiden, havner det her."
						/>
					{:else}
						<EmptyState
							icon={Inbox}
							title="Ingen i denne visningen"
							description="Bytt fane for å se de andre henvendelsene."
						/>
					{/if}
				</div>
			{:else}
				<div class="min-h-0 flex-1 overflow-y-auto">
					{#each filtered as inq (inq.id)}
						{@const ch = channel(inq.source)}
						<button
							type="button"
							onclick={() => selectInquiry(inq)}
							aria-current={selected?.id === inq.id ? 'true' : undefined}
							class={cn(
								'flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left outline-none transition-colors last:border-b-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
								selected?.id === inq.id && 'bg-muted'
							)}
						>
							<span
								class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-text-body"
								aria-hidden="true"
							>
								{initials(inq.name)}
							</span>
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="flex items-center gap-1.5">
									<span class="truncate text-sm font-medium text-foreground">{inq.name}</span>
									<ch.icon class="size-3 shrink-0 text-text-subtle" aria-hidden="true" />
								</span>
								<span class="truncate text-xs text-muted-foreground">{inq.message}</span>
							</span>
							<span class="flex shrink-0 flex-col items-end gap-1.5">
								<span class="whitespace-nowrap text-xs text-text-subtle">
									{relativeTime(inq.created)}
								</span>
								<span
									class={cn('size-2 rounded-full', statusDot(inq.status))}
									aria-hidden="true"
								></span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Detaljkort -->
		<div
			class={cn(
				'min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card',
				mobileDetailOpen ? 'flex' : 'hidden lg:flex'
			)}
		>
			{#if selected}
				{@const ch = channel(selected.source)}
				<!-- Header -->
				<div class="flex shrink-0 flex-col gap-4 border-b border-border p-6">
					<button
						type="button"
						onclick={backToList}
						class="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
					>
						<ChevronLeft class="size-4" />
						Tilbake
					</button>
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="text-lg font-semibold text-foreground">{selected.name}</h2>
								<StatusBadge collection="inquiries" status={selected.status} />
								{#if selected.expand?.product}
									<span
										class="inline-flex h-[22px] items-center rounded-full bg-accent-blue-bg px-2 text-xs font-medium text-accent-blue-text"
									>
										{selected.expand.product.name}
									</span>
								{/if}
							</div>
							<p class="mt-1.5 text-xs text-muted-foreground">
								{selected.email}{selected.phone ? ` · ${selected.phone}` : ''} · {ch.label}
							</p>
							<p class="mt-0.5 text-xs text-text-subtle">
								Mottatt {formatDate(selected.created)}, {formatTime(selected.created)}
							</p>
						</div>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class={statusTriggerClass}>
								Endre status
								<ChevronDown class="size-4 text-text-subtle" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								{#each STATUS_ACTIONS as a (a.value)}
									<DropdownMenu.Item
										disabled={selected.status === a.value}
										onSelect={() => changeStatus(selected, a.value, a.toast)}
									>
										{#if selected.status === a.value}
											<Check class="size-4" />
										{/if}
										{a.label}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>

				<!-- Body -->
				<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
					<p class="whitespace-pre-line text-sm leading-relaxed text-text-body">
						{selected.message}
					</p>

					<!-- Kunde -->
					{#if selected.expand?.customer}
						<div class="flex flex-col gap-2">
							<p
								class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
							>
								Kunde
							</p>
							<a
								href="/kunder"
								class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent-blue-text outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
							>
								{selected.expand.customer.name}
								<ExternalLink class="size-3.5" />
							</a>
						</div>
					{/if}

					<!-- Vedlegg -->
					<div class="flex flex-col gap-2">
						<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
							Vedlegg{selected.attachments?.length ? ` (${selected.attachments.length})` : ''}
						</p>
						{#if selected.attachments?.length}
							<div class="flex flex-wrap gap-3">
								{#each selected.attachments as file (file)}
									<div
										class="flex h-[72px] w-24 items-center justify-center rounded-md bg-muted text-text-subtle"
										title={file}
									>
										<Paperclip class="size-5" aria-hidden="true" />
									</div>
								{/each}
							</div>
						{:else}
							<p class="flex items-center gap-2 text-sm text-text-subtle">
								<Paperclip class="size-4" aria-hidden="true" />
								Ingen vedlegg
							</p>
						{/if}
					</div>

					<div class="h-px w-full bg-border"></div>

					<!-- Svar -->
					<div class="flex flex-col gap-3">
						<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
							Svar
						</p>
						<Textarea
							bind:value={reply}
							rows={4}
							placeholder="Skriv et svar til {firstName(selected.name)} …"
							aria-label="Svar til {selected.name}"
						/>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="text-xs text-text-subtle">
								Svaret åpnes i e-postklienten din. Sending fra dashbordet kommer senere.
							</p>
							<Button onclick={() => sendReply(selected)}>
								<Send class="size-4" />
								Send svar
							</Button>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-1 items-center justify-center p-6">
					<p class="text-sm text-text-subtle">Velg en henvendelse i listen</p>
				</div>
			{/if}
		</div>
	</div>
</div>
