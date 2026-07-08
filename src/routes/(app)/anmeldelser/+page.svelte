<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Star from '@lucide/svelte/icons/star';
	import Send from '@lucide/svelte/icons/send';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { pb } from '$lib/pb';
	import { auth } from '$lib/stores/auth.svelte';
	import {
		Collections,
		ReviewsStatusOptions,
		type ReviewsResponse,
		type ReviewsPlatformOptions
	} from '$lib/pocketbase-types';
	import { relativeTime, formatDate, initials } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const reviews = $derived(data.reviews);
	const integrations = $derived(data.integrations);
	const business = $derived(data.business);
	const businessId = $derived(business?.id ?? '');
	const businessName = $derived(business?.name ?? 'Bedriften');

	// --- KPI header ----------------------------------------------------------
	const total = $derived(reviews.length);
	const repliedCount = $derived(reviews.filter((r) => r.status === 'replied').length);
	const newCount = $derived(total - repliedCount);
	const avgRating = $derived(total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0);
	const replyRate = $derived(total ? Math.round((repliedCount / total) * 100) : 0);
	const googleCount = $derived(reviews.filter((r) => r.platform === 'google').length);
	const facebookCount = $derived(reviews.filter((r) => r.platform === 'facebook').length);

	// One-decimal, comma-separated rating: 4.83 → «4,8» (page-local, nb-NO).
	const ratingFmt = new Intl.NumberFormat('nb-NO', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	// --- platform presentation ----------------------------------------------
	function platformLabel(platform: ReviewsPlatformOptions): string {
		return platform === 'google' ? 'Google' : 'Facebook';
	}

	const STARS = [0, 1, 2, 3, 4];

	// --- filter --------------------------------------------------------------
	type Filter = 'all' | 'new' | 'replied';
	let activeFilter = $state<Filter>('all');
	const FILTERS = $derived<{ value: Filter; label: string; count: number }[]>([
		{ value: 'all', label: 'Alle', count: total },
		{ value: 'new', label: 'Ubesvarte', count: newCount },
		{ value: 'replied', label: 'Besvarte', count: repliedCount }
	]);
	const filtered = $derived(
		activeFilter === 'all' ? reviews : reviews.filter((r) => r.status === activeFilter)
	);

	// --- reply composer ------------------------------------------------------
	// Reviews are read-only apart from the reply. «Svar»/«Rediger svar» opens an
	// inline composer for exactly one card at a time; «Publiser svar» writes it.
	let openId = $state<string | null>(null);
	let draft = $state('');
	let saving = $state(false);

	function openReply(review: ReviewsResponse) {
		openId = review.id;
		draft = review.reply_text ?? '';
	}
	function cancelReply() {
		openId = null;
		draft = '';
	}

	async function publishReply(review: ReviewsResponse) {
		const body = draft.trim();
		if (!body) {
			toast.error('Skriv et svar før du publiserer.');
			return;
		}
		saving = true;
		try {
			// Update rule: reply_text MUST be sent, business MUST NOT be sent.
			await pb.collection(Collections.Reviews).update(review.id, {
				reply_text: body,
				replied_at: new Date().toISOString(),
				status: ReviewsStatusOptions.replied
			});
			toast.success('Svaret er lagret og publisert.');
			openId = null;
			draft = '';
			await invalidate('app:reviews');
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	// --- loading -------------------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/anmeldelser'
	);
	const skeletonCards = [0, 1, 2];

	// --- realtime ------------------------------------------------------------
	// Re-run this load on any review change for the active tenant (e.g. a new
	// synced review, or a reply from another session). Re-subscribes on business
	// change; ignores subscribe/abort failures.
	$effect(() => {
		const bid = businessId;
		if (!bid) return;
		let active = true;
		let unsub: (() => void) | undefined;
		pb.collection(Collections.Reviews)
			.subscribe(
				'*',
				() => {
					if (active) invalidate('app:reviews');
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

	// --- «Be om anmeldelse» (review-request settings) ------------------------
	// Honest scope: this persists a *preference* to businesses.settings. The
	// actual SMS scheduling/sending is a deferred server hook, so the copy never
	// claims a message is sent.
	type ReviewRequest = { enabled?: boolean; delay_hours?: number; sms_template?: string };

	const reviewRequest = $derived.by<ReviewRequest>(() => {
		const s = business?.settings as { review_request?: ReviewRequest } | null | undefined;
		return s?.review_request ?? {};
	});

	// Owners write via the business owner rule; agency users via the agency rule.
	// Staff cannot write settings, so their controls are read-only.
	const canEditSettings = $derived(auth.isAgency || auth.user?.role === 'owner');

	const defaultTemplate = $derived(
		`Hei {navn}! Takk for besøket hos ${businessName} 💛 Vil du dele opplevelsen din? Det tar 30 sekunder.`
	);
	const templateToSave = $derived(reviewRequest.sms_template || defaultTemplate);

	// Sample the newest reviewer's first name for the preview; fall back to «Kari».
	const sampleName = $derived(reviews[0]?.author?.trim().split(/\s+/)[0] || 'Kari');
	const smsPreview = $derived(templateToSave.replace(/\{navn\}|\{name\}/gi, sampleName));

	const DELAY_OPTIONS = [
		{ value: '1', label: '1 time' },
		{ value: '2', label: '2 timer' },
		{ value: '4', label: '4 timer' },
		{ value: '24', label: '24 timer' }
	];

	let smsEnabled = $state(false);
	let delayHours = $state(2);
	const delayLabel = $derived(
		DELAY_OPTIONS.find((o) => o.value === String(delayHours))?.label ?? `${delayHours} timer`
	);

	// Seed the local controls from settings; resync when the tenant changes.
	$effect(() => {
		const rr = reviewRequest;
		smsEnabled = rr.enabled ?? false;
		delayHours = rr.delay_hours ?? 2;
	});

	async function saveReviewRequest(): Promise<boolean> {
		if (!business) return false;
		const existing =
			business.settings && typeof business.settings === 'object'
				? { ...(business.settings as Record<string, unknown>) }
				: {};
		try {
			// Send ONLY `settings` — status/slug/modules/type are blocked by the rule.
			await pb.collection(Collections.Businesses).update(business.id, {
				settings: {
					...existing,
					review_request: {
						enabled: smsEnabled,
						delay_hours: delayHours,
						sms_template: templateToSave
					}
				}
			});
			toast.success('Innstillingen er lagret.');
			return true;
		} catch (e) {
			toast.error(pbError(e));
			return false;
		}
	}

	async function toggleEnabled(v: boolean) {
		smsEnabled = v;
		if (!(await saveReviewRequest())) smsEnabled = !v;
	}
	async function selectDelay(v: string | undefined) {
		if (!v) return;
		const prev = delayHours;
		delayHours = Number(v);
		if (!(await saveReviewRequest())) delayHours = prev;
	}

	// --- connections ---------------------------------------------------------
	function connection(provider: 'google' | 'meta') {
		return integrations.find((i) => i.provider === provider)?.status ?? 'not_connected';
	}

	const capsLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<svelte:head><title>Anmeldelser · NP Dashboard</title></svelte:head>

<div class="flex h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Sidetopp -->
	<header class="shrink-0">
		<h1 class="text-2xl font-semibold text-foreground">Anmeldelser</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Google- og Facebook-anmeldelser — samlet og besvart her.
		</p>
	</header>

	<!-- KPI-rekke -->
	<div class="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<KpiCard
			label="Snittvurdering"
			value={total ? ratingFmt.format(avgRating) : '–'}
			trend={{ direction: 'neutral', delta: 'av 5 mulige' }}
		/>
		<KpiCard
			label="Antall anmeldelser"
			value={total}
			trend={{ direction: 'neutral', delta: `${googleCount} Google · ${facebookCount} Facebook` }}
		/>
		<KpiCard
			label="Ubesvarte"
			value={newCount}
			trend={{ direction: 'neutral', delta: 'svar innen 48 timer anbefales' }}
		/>
		<KpiCard
			label="Svarprosent"
			value={total ? `${replyRate} %` : '–'}
			trend={{ direction: 'neutral', delta: `${repliedCount} av ${total} besvart` }}
		/>
	</div>

	<!-- Kolonner -->
	<div class="flex flex-col gap-6 lg:flex-row">
		<!-- Venstre kolonne: filter + anmeldelser -->
		<div class="flex min-w-0 flex-1 flex-col gap-4">
			<!-- Filterrad (underline-faner, som Henvendelser) -->
			<div
				class="flex shrink-0 gap-6 overflow-x-auto border-b border-border"
				role="group"
				aria-label="Filtrer anmeldelser"
			>
				{#each FILTERS as f (f.value)}
					<button
						type="button"
						aria-pressed={activeFilter === f.value}
						onclick={() => (activeFilter = f.value)}
						class={cn(
							'relative -mb-px whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
							activeFilter === f.value
								? 'border-foreground text-foreground'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						{f.label} ({f.count})
					</button>
				{/each}
			</div>

			{#if isLoading}
				<div class="flex flex-col gap-4">
					{#each skeletonCards as c (c)}
						<div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
							<div class="flex items-start gap-3">
								<Skeleton class="size-6 shrink-0 rounded-full" />
								<div class="flex flex-1 flex-col gap-1.5">
									<Skeleton class="h-3.5 w-40" />
									<Skeleton class="h-3 w-24" />
								</div>
							</div>
							<Skeleton class="h-4 w-full max-w-[420px]" />
							<Skeleton class="h-8 w-full" />
						</div>
					{/each}
				</div>
			{:else if filtered.length === 0}
				<div class="flex flex-1 items-center justify-center rounded-lg border border-border bg-card">
					{#if reviews.length === 0}
						<EmptyState
							icon={Star}
							title="Ingen anmeldelser ennå"
							description="Når kundene legger igjen en vurdering på Google eller Facebook, dukker den opp her — klar til å besvares."
						/>
					{:else}
						<EmptyState
							icon={Star}
							title="Ingen i denne visningen"
							description="Bytt filter for å se de andre anmeldelsene."
						/>
					{/if}
				</div>
			{:else}
				<div class="flex flex-col gap-4">
					{#each filtered as review (review.id)}
						<article class="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
							<!-- Hode -->
							<div class="flex items-start gap-3">
								<span
									class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-text-body"
									aria-hidden="true"
								>
									{initials(review.author)}
								</span>
								<div class="flex min-w-0 flex-1 flex-col gap-0.5">
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-sm font-medium text-foreground">{review.author}</span>
										<span
											class="inline-flex h-[22px] items-center rounded-full bg-muted px-2 text-xs font-medium text-text-body"
										>
											{platformLabel(review.platform)}
										</span>
									</div>
									<div
										class="flex items-center gap-0.5"
										role="img"
										aria-label="{review.rating} av 5 stjerner"
									>
										{#each STARS as i (i)}
											<Star
												class={cn(
													'size-3.5',
													i < review.rating
														? 'fill-amber-400 text-amber-400'
														: 'fill-none text-border'
												)}
												aria-hidden="true"
											/>
										{/each}
									</div>
								</div>
								<span class="shrink-0 whitespace-nowrap text-xs text-text-subtle">
									{relativeTime(review.posted_at)}
								</span>
							</div>

							<!-- Anmeldelsestekst -->
							{#if review.text}
								<p class="text-sm leading-relaxed text-text-body">{review.text}</p>
							{/if}

							{#if openId === review.id}
								<!-- Inline svar-komponist -->
								<div class="h-px w-full bg-border"></div>
								<p class={capsLabel}>Ditt svar</p>
								<Textarea
									bind:value={draft}
									rows={3}
									name="review-reply"
									placeholder="Skriv et svar til {review.author.split(' ')[0]} …"
									aria-label="Svar til {review.author}"
								/>
								<div class="flex items-center justify-end gap-2">
									<Button variant="ghost" onclick={cancelReply} disabled={saving}>Forkast</Button>
									<Button onclick={() => publishReply(review)} disabled={saving}>
										<Send class="size-4" />
										{saving ? 'Publiserer …' : 'Publiser svar'}
									</Button>
								</div>
							{:else if review.status === 'replied'}
								<!-- Publisert svar -->
								<div class="flex flex-col gap-1 rounded-md bg-muted p-3 text-xs">
									<p class="font-medium text-foreground">
										{businessName} svarte{review.replied_at
											? ` · ${formatDate(review.replied_at)}`
											: ''}:
									</p>
									<p class="leading-relaxed text-text-body">{review.reply_text}</p>
								</div>
								<div class="flex items-center justify-between">
									<StatusBadge collection="reviews" status={review.status} />
									<Button variant="ghost" onclick={() => openReply(review)}>Rediger svar</Button>
								</div>
							{:else}
								<!-- Ubesvart -->
								<div class="flex items-center justify-between">
									<StatusBadge collection="reviews" status={review.status} />
									<Button variant="outline" onclick={() => openReply(review)}>Svar</Button>
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Høyre kolonne: be om anmeldelse + tilkoblinger -->
		<aside class="flex w-full flex-col gap-6 lg:w-[360px] lg:shrink-0">
			<!-- Be om anmeldelse -->
			<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
				<h2 class="text-base font-semibold text-foreground">Be om anmeldelse</h2>
				<div class="flex items-center gap-3">
					<Switch
						checked={smsEnabled}
						onCheckedChange={toggleEnabled}
						disabled={!canEditSettings}
						aria-label="Spør etter booking"
					/>
					<span class="text-sm font-medium text-foreground">Spør etter booking</span>
				</div>
				<p class="text-xs leading-relaxed text-muted-foreground">
					Kunden får en SMS med lenke til Google-anmeldelse etter fullført time.
				</p>

				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-medium text-foreground">Send etter</span>
					<Select.Root
						type="single"
						value={String(delayHours)}
						onValueChange={selectDelay}
						disabled={!canEditSettings}
					>
						<Select.Trigger class="w-full">{delayLabel}</Select.Trigger>
						<Select.Content>
							{#each DELAY_OPTIONS as o (o.value)}
								<Select.Item value={o.value} label={o.label}>{o.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="h-px w-full bg-border"></div>
				<p class={capsLabel}>Forhåndsvisning</p>
				<div class="rounded-md bg-muted p-3">
					<p class="text-xs leading-relaxed text-text-body">{smsPreview}</p>
				</div>
				<p class="text-xs leading-relaxed text-text-subtle">
					{#if canEditSettings}
						Innstillingen lagres nå. Automatisk SMS-utsending kobles på senere.
					{:else}
						Bare eier eller byrå kan endre disse innstillingene.
					{/if}
				</p>
			</section>

			<!-- Tilkoblinger -->
			<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
				<h2 class="text-base font-semibold text-foreground">Tilkoblinger</h2>
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm text-text-body">Google Business-profil</span>
					<StatusBadge collection="integrations" status={connection('google')} />
				</div>
				<div class="flex items-center justify-between gap-3">
					<span class="text-sm text-text-body">Facebook-side</span>
					<StatusBadge collection="integrations" status={connection('meta')} />
				</div>
			</section>
		</aside>
	</div>
</div>
