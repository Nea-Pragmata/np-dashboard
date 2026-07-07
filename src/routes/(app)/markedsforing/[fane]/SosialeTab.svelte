<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import LayoutTemplate from '@lucide/svelte/icons/layout-template';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Plus from '@lucide/svelte/icons/plus';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import PostDrawer from './PostDrawer.svelte';
	import { pb } from '$lib/pb';
	import { Collections, SocialPostsStatusOptions } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import {
		buildMonthMatrix,
		channelAbbr,
		channelLabel,
		formatDayMonth,
		formatMonthTitle,
		WEEKDAYS,
		type SocialPostRow,
		type TemplateRow
	} from '../marketing';

	let {
		posts,
		templates,
		businessId,
		canManage,
		onchanged
	}: {
		posts: SocialPostRow[];
		templates: TemplateRow[];
		businessId: string;
		/** Agency viewer — may create/edit/publish/delete posts. */
		canManage: boolean;
		onchanged: () => void;
	} = $props();

	let subview = $state<'kalender' | 'maler'>('kalender');

	// --- calendar ------------------------------------------------------------
	const now = new Date();
	let viewDate = $state(new Date(now.getFullYear(), now.getMonth(), 1));
	const matrix = $derived(buildMonthMatrix(viewDate, posts));
	const monthTitle = $derived(
		formatMonthTitle(viewDate).replace(/^./, (c) => c.toUpperCase())
	);
	function shiftMonth(delta: number) {
		viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
	}

	const pending = $derived(posts.filter((p) => p.status === SocialPostsStatusOptions.pending_approval));

	/** Posts scheduled soonest-first, with dateless drafts pushed to the end. */
	const planned = $derived(
		[...posts].sort((a, b) => {
			if (!a.scheduled_at) return 1;
			if (!b.scheduled_at) return -1;
			return a.scheduled_at.localeCompare(b.scheduled_at);
		})
	);

	// --- post editor (agency) ------------------------------------------------
	let drawerOpen = $state(false);
	let editingPost = $state<SocialPostRow | null>(null);
	let drawerPrefill = $state('');

	/** Exposed to the page shell so the header «Nytt innlegg» button can open it. */
	export function openNewPost() {
		editingPost = null;
		drawerPrefill = '';
		drawerOpen = true;
	}
	function editPost(p: SocialPostRow) {
		editingPost = p;
		drawerPrefill = '';
		drawerOpen = true;
	}
	function useTemplate(t: TemplateRow) {
		editingPost = null;
		drawerPrefill = t.body;
		drawerOpen = true;
	}

	// --- customer approval ---------------------------------------------------
	async function approve(p: SocialPostRow) {
		try {
			// Narrow update: only `status` changes (satisfies the customer rule
			// branch and the agency BY branch alike).
			await pb
				.collection(Collections.SocialPosts)
				.update(p.id, { status: SocialPostsStatusOptions.approved });
			toast.success('Innlegget er godkjent.');
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
		}
	}
	function requestChange() {
		toast.info('Gi oss beskjed om hva du vil endre, så ordner byrået det. Du kan ikke endre innholdet selv.');
	}

	// --- agency status shortcuts + delete ------------------------------------
	async function setStatus(p: SocialPostRow, status: SocialPostsStatusOptions, msg: string) {
		try {
			await pb.collection(Collections.SocialPosts).update(p.id, { status });
			toast.success(msg);
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	let deleteOpen = $state(false);
	let deleteTarget = $state<SocialPostRow | null>(null);
	function askDelete(p: SocialPostRow) {
		deleteTarget = p;
		deleteOpen = true;
	}
	async function confirmDelete() {
		const p = deleteTarget;
		if (!p) return;
		try {
			await pb.collection(Collections.SocialPosts).delete(p.id);
			toast.success('Innlegget er slettet.');
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	function postSummary(p: SocialPostRow): string {
		const text = p.content.replace(/\s+/g, ' ').trim();
		return text.length > 60 ? `${text.slice(0, 60)}…` : text || '(uten tekst)';
	}

	const segBase =
		'flex h-8 w-[110px] items-center justify-center rounded-[4px] text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring';
	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
	const cardHeader = 'flex items-center justify-between gap-3 border-b border-border px-5 py-4';
</script>

<div class="flex flex-col gap-6">
	<!-- Kalender / Maler -->
	<div class="flex items-center gap-1 self-start rounded-md bg-muted p-0.5" role="tablist" aria-label="Visning">
		<button
			type="button"
			role="tab"
			aria-selected={subview === 'kalender'}
			class={cn(segBase, subview === 'kalender' ? 'border border-border bg-card text-foreground' : 'text-muted-foreground hover:text-foreground')}
			onclick={() => (subview = 'kalender')}
		>
			Kalender
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={subview === 'maler'}
			class={cn(segBase, subview === 'maler' ? 'border border-border bg-card text-foreground' : 'text-muted-foreground hover:text-foreground')}
			onclick={() => (subview = 'maler')}
		>
			Maler
		</button>
	</div>

	{#if subview === 'kalender'}
		<!-- Honesty note: content is produced by the agency (AI-assisted) and never
		     auto-published — suggestions sit as drafts until the customer approves. -->
		<div class="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
			<span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-blue-bg text-accent-blue-text">
				<Sparkles class="size-4" />
			</span>
			<p class="text-sm text-muted-foreground">
				Innholdet lages av NP – med AI-hjelp – og publiseres aldri automatisk. Forslag ligger som
				<span class="font-medium text-foreground">«Utkast»</span> til du har godkjent dem.
			</p>
		</div>

		<div class="grid gap-6 lg:grid-cols-[1fr_384px]">
			<!-- Venstre: månedskalender -->
			<section class="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
				<div class="flex items-center justify-between">
					<h3 class="text-base font-semibold text-foreground">{monthTitle}</h3>
					<div class="flex items-center gap-1">
						<button type="button" class={triggerClass} aria-label="Forrige måned" onclick={() => shiftMonth(-1)}>
							<ChevronLeft class="size-4" />
						</button>
						<button type="button" class={triggerClass} aria-label="Neste måned" onclick={() => shiftMonth(1)}>
							<ChevronRight class="size-4" />
						</button>
					</div>
				</div>

				<div class="grid grid-cols-7 pb-1 pt-2">
					{#each WEEKDAYS as w (w)}
						<div class="text-center text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
							{w}
						</div>
					{/each}
				</div>

				<div class="grid grid-cols-7 gap-px">
					{#each matrix as week (week[0].date.getTime())}
						{#each week as cell (cell.date.getTime())}
							<div
								class={cn(
									'flex min-h-[76px] flex-col gap-1 rounded-md p-1.5',
									cell.inMonth ? '' : 'opacity-45',
									cell.isToday ? 'border border-accent-blue' : ''
								)}
							>
								<span class={cn('text-xs', cell.isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
									{cell.day}.
								</span>
								{#each cell.posts as p (p.id)}
									<span
										class="truncate rounded bg-accent-blue-bg px-1.5 py-0.5 text-[11px] font-medium text-accent-blue-text"
										title="{channelLabel(p.channel)} · {postSummary(p)}"
									>
										{channelAbbr(p.channel)} · {postSummary(p)}
									</span>
								{/each}
							</div>
						{/each}
					{/each}
				</div>
			</section>

			<!-- Høyre: godkjenning + planlagte -->
			<div class="flex flex-col gap-6">
				<!-- Til godkjenning -->
				{#if pending.length > 0}
					<section class="rounded-lg border border-border bg-card p-6">
						<h3 class="text-base font-semibold text-foreground">Til godkjenning ({pending.length})</h3>
						<div class="mt-3 flex flex-col divide-y divide-border">
							{#each pending as p (p.id)}
								<div class="flex flex-col gap-3 py-4 first:pt-1 last:pb-0">
									<div class="flex items-center gap-3">
										<span class="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-text-subtle">
											<ImageIcon class="size-4" />
										</span>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium text-foreground">{postSummary(p)}</p>
											<p class="text-xs text-muted-foreground">
												{channelLabel(p.channel)}{p.scheduled_at ? ` · planlagt ${formatDayMonth(p.scheduled_at)}` : ''}
											</p>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Button variant="outline" size="sm" onclick={() => approve(p)}>
											<Check class="size-4" />
											Godkjenn
										</Button>
										{#if canManage}
											<Button variant="ghost" size="sm" onclick={() => editPost(p)}>Rediger</Button>
										{:else}
											<Button variant="ghost" size="sm" onclick={requestChange}>Be om endring</Button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Planlagte innlegg -->
				<section class="overflow-hidden rounded-lg border border-border bg-card">
					<div class={cardHeader}>
						<h3 class="text-base font-semibold text-foreground">Planlagte innlegg</h3>
					</div>
					{#if planned.length === 0}
						<EmptyState
							icon={CalendarDays}
							title="Ingen innlegg ennå"
							description="Når byrået planlegger innlegg for deg, dukker de opp her – klare til godkjenning."
							class="py-10"
						/>
					{:else}
						<ul>
							{#each planned as p (p.id)}
								<li class="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
									<span class="w-14 shrink-0 text-xs text-muted-foreground">
										{p.scheduled_at ? formatDayMonth(p.scheduled_at) : '—'}
									</span>
									<span class="w-6 shrink-0 text-xs font-medium text-text-body">{channelAbbr(p.channel)}</span>
									<span class="min-w-0 flex-1 truncate text-sm text-text-body">{postSummary(p)}</span>
									<StatusBadge collection="social_posts" status={p.status} />
									{#if canManage}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for innlegg">
												<Ellipsis class="size-4" />
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end">
												<DropdownMenu.Item onSelect={() => editPost(p)}>Rediger</DropdownMenu.Item>
												{#if p.status === SocialPostsStatusOptions.draft}
													<DropdownMenu.Item
														onSelect={() => setStatus(p, SocialPostsStatusOptions.pending_approval, 'Sendt til godkjenning.')}
													>
														Send til godkjenning
													</DropdownMenu.Item>
												{/if}
												{#if p.status === SocialPostsStatusOptions.approved}
													<DropdownMenu.Item
														onSelect={() => setStatus(p, SocialPostsStatusOptions.published, 'Innlegget er publisert.')}
													>
														Marker som publisert
													</DropdownMenu.Item>
												{/if}
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													class="text-destructive data-highlighted:text-destructive"
													onSelect={() => askDelete(p)}
												>
													Slett
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		</div>
	{:else}
		<!-- Malbibliotek -->
		<section class="overflow-hidden rounded-lg border border-border bg-card">
			<div class="border-b border-border px-6 py-5">
				<h3 class="text-base font-semibold text-foreground">Malbibliotek</h3>
				<p class="mt-1 text-sm text-muted-foreground">Ferdige maler for sosiale innlegg – laget av byrået.</p>
			</div>
			{#if templates.length === 0}
				<EmptyState
					icon={LayoutTemplate}
					title="Ingen maler ennå"
					description="Byrået legger ferdige innleggsmaler her, så du raskt kommer i gang."
					class="py-12"
				/>
			{:else}
				<div class="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each templates as t (t.id)}
						<div class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
							<div class="flex h-28 items-center justify-center bg-muted text-text-subtle">
								<ImageIcon class="size-5" />
							</div>
							<div class="flex items-center justify-between gap-3 p-4">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-foreground">{t.name}</p>
									<p class="text-xs text-muted-foreground">Sosialt innlegg</p>
								</div>
								{#if canManage}
									<Button variant="ghost" size="sm" onclick={() => useTemplate(t)}>
										<Plus class="size-4" />
										Bruk mal
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

{#if canManage}
	<PostDrawer
		bind:open={drawerOpen}
		post={editingPost}
		prefillBody={drawerPrefill}
		{businessId}
		onsaved={onchanged}
	/>
	<ConfirmDialog
		bind:open={deleteOpen}
		title="Slette innlegget?"
		description={deleteTarget ? `«${postSummary(deleteTarget)}» slettes. Dette kan ikke angres.` : undefined}
		confirmLabel="Slett"
		cancelLabel="Avbryt"
		destructive
		onconfirm={confirmDelete}
	/>
{/if}
