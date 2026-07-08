<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidate } from '$app/navigation';
	import Globe from '@lucide/svelte/icons/globe';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { formatDate } from '$lib/utils/format';
	import PageDrawer from './PageDrawer.svelte';
	import type { PagesResponse } from '$lib/pocketbase-types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pages = $derived(data.pages);
	const siteStatus = $derived(data.siteStatus);
	const integrations = $derived(data.integrations);
	const jobRuns = $derived(data.jobRuns);
	const business = $derived(data.business);

	// --- external links (no domain field in the data model yet) --------------
	// «Se nettsiden» / «Åpne profilen» resolve the tenant's live presence via
	// Google rather than fabricating a URL we can't verify.
	const siteSearchUrl = $derived(
		`https://www.google.com/search?q=${encodeURIComponent(business?.name ?? '')}`
	);
	const mapsUrl = $derived(
		`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
			[business?.name, business?.address].filter(Boolean).join(' ')
		)}`
	);

	// --- Google Business-profil (from the integration_status view) -----------
	const google = $derived(integrations.find((i) => i.provider === 'google'));
	const googleStatus = $derived(google?.status ?? 'not_connected');
	const googleConnected = $derived(googleStatus === 'connected');

	// --- SEO -----------------------------------------------------------------
	const seoReview = $derived(siteStatus?.seo_review_date || '');
	// The newest client-visible automated SEO run, for the review status line.
	const seoRun = $derived(jobRuns.find((r) => r.expand?.job?.type === 'seo'));
	// Header health: a recent agency review reads «I orden»; a stale one «Se over».
	const seoHealth = $derived.by(() => {
		if (!seoReview) return 'unknown';
		const ageDays = (Date.now() - new Date(seoReview).getTime()) / 86_400_000;
		return ageDays <= 120 ? 'ok' : 'warning';
	});

	// --- Drift og sikkerhet helpers (nb-NO, page-local) ----------------------
	const uptimeFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
	function uptimeLabel(u?: number): string {
		return u === undefined || u === null ? '—' : `${uptimeFormatter.format(u)} %`;
	}
	const backupTimeFormatter = new Intl.DateTimeFormat('nb-NO', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'UTC'
	});
	function backupLabel(iso?: string): string {
		if (!iso) return '—';
		const d = new Date(iso);
		const time = backupTimeFormatter.format(d);
		const sameDay = d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
		return sameDay ? `I natt kl. ${time}` : `${formatDate(d)} kl. ${time}`;
	}

	// --- edit drawer ---------------------------------------------------------
	let drawerOpen = $state(false);
	let editing = $state<PagesResponse | null>(null);

	function editPage(page: PagesResponse) {
		editing = page;
		drawerOpen = true;
	}

	function afterSave() {
		invalidate('app:nettsted');
	}

	// --- loading -------------------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/nettsted'
	);
	const skeletonRows = [0, 1, 2, 3];
</script>

<svelte:head><title>Nettsted &amp; SEO · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Sidetopp -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Nettsted &amp; SEO</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Innholdet på nettsiden din — og hvordan den synes på Google.
			</p>
		</div>
		<Button
			variant="outline"
			href={siteSearchUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			<ExternalLink class="size-4" />
			Se nettsiden
		</Button>
	</header>

	<!-- Byrået publiserer — prominent note -->
	<div
		class="flex items-start gap-2.5 rounded-lg bg-accent-blue-bg px-4 py-3 text-sm text-accent-blue-text"
	>
		<Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
		<p>
			Du redigerer innholdet selv, og byrået publiserer endringene på nettsiden
			<span class="font-medium">innen én virkedag</span>.
		</p>
	</div>

	<!-- Kolonner -->
	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<!-- Venstre: sider på nettsiden -->
		<section class="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
			<div class="px-6 pb-3 pt-6">
				<h2 class="text-base font-semibold text-foreground">Sider på nettsiden</h2>
			</div>

			{#if isLoading}
				{#each skeletonRows as r (r)}
					<div class="flex h-14 items-center gap-3 border-t border-border px-6">
						<Skeleton class="size-4 shrink-0 rounded" />
						<div class="flex flex-1 flex-col gap-1.5">
							<Skeleton class="h-3.5 w-28" />
							<Skeleton class="h-3 w-20" />
						</div>
						<Skeleton class="h-8 w-24 rounded-md" />
					</div>
				{/each}
			{:else if pages.length === 0}
				<div class="border-t border-border">
					<EmptyState
						icon={Globe}
						title="Ingen sider ennå"
						description="Byrået legger sidene på nettstedet ditt her. Ta kontakt hvis du mangler noe."
					/>
				</div>
			{:else}
				{#each pages as page (page.id)}
					<div class="flex h-14 items-center gap-3 border-t border-border px-6">
						<FileText class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
						<div class="flex min-w-0 flex-1 flex-col">
							<div class="flex items-center gap-2">
								<span class="truncate text-sm font-medium text-foreground">{page.name}</span>
								<StatusBadge collection="pages" status={page.status} />
							</div>
							<span class="text-xs text-muted-foreground">Endret {formatDate(page.updated)}</span>
						</div>
						<Button variant="ghost" onclick={() => editPage(page)}>
							<Pencil class="size-4" />
							Rediger
						</Button>
					</div>
				{/each}
			{/if}
		</section>

		<!-- Høyre: status -->
		<aside class="flex shrink-0 flex-col gap-6 lg:w-96">
			{#if isLoading}
				{#each [0, 1, 2] as c (c)}
					<div class="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
						<Skeleton class="h-5 w-32" />
						<Skeleton class="h-3.5 w-full" />
						<Skeleton class="h-3.5 w-3/4" />
					</div>
				{/each}
			{:else}
				<!-- SEO -->
				<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
					<div class="flex items-center gap-3">
						<h2 class="min-w-0 flex-1 text-base font-semibold text-foreground">SEO</h2>
						<StatusBadge collection="site_status" status={seoHealth} />
					</div>
					<p class="text-xs text-muted-foreground">
						{#if seoReview}
							Følges opp av byrået. Sist gjennomgått {formatDate(seoReview)}.
						{:else}
							Følges opp av byrået.
						{/if}
					</p>
					{#if seoRun}
						<div class="flex flex-col gap-1.5 rounded-lg bg-muted p-3">
							<div class="flex items-center gap-2">
								<StatusBadge collection="ai_job_runs" status={seoRun.result} />
								{#if seoRun.findings?.summary}
									<span class="text-sm text-text-body">{seoRun.findings.summary}</span>
								{/if}
							</div>
							<span class="text-xs text-text-subtle">
								Automatisk SEO-gjennomgang {formatDate(seoRun.ran_at)}
							</span>
						</div>
					{/if}
				</section>

				<!-- Google Business-profil -->
				<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
					<div class="flex items-center gap-3">
						<h2 class="min-w-0 flex-1 text-base font-semibold text-foreground">
							Google Business-profil
						</h2>
						<StatusBadge collection="integration_status" status={googleStatus} />
					</div>
					{#if googleConnected}
						<div class="flex items-center gap-2">
							<Check class="size-3.5 shrink-0 text-success" aria-hidden="true" />
							<span class="text-sm text-text-body">Synlig på Google Maps og i lokale søk</span>
						</div>
						<Button
							variant="outline"
							class="w-fit"
							href={mapsUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLink class="size-4" />
							Åpne profilen
						</Button>
					{:else}
						<p class="text-sm text-text-body">
							Byrået kobler til Google-profilen din, slik at bedriften synes på Google Maps og i
							lokale søk.
						</p>
					{/if}
				</section>

				<!-- Drift og sikkerhet -->
				<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
					<h2 class="text-base font-semibold text-foreground">Drift og sikkerhet</h2>
					{#if siteStatus}
						<div class="flex flex-col">
							<div class="flex h-8 items-center gap-3 text-sm">
								<span class="flex-1 text-text-body">Oppetid siste 30 dager</span>
								<span class="font-medium text-foreground">{uptimeLabel(siteStatus.uptime)}</span>
							</div>
							<div class="flex h-8 items-center gap-3 text-sm">
								<span class="flex-1 text-text-body">Siste sikkerhetskopi</span>
								<span class="font-medium text-foreground">{backupLabel(siteStatus.last_backup)}</span>
							</div>
							<div class="flex h-8 items-center gap-3 text-sm">
								<span class="flex-1 text-text-body">SSL-sertifikat</span>
								<StatusBadge collection="site_status" status={siteStatus.ssl_status ?? 'unknown'} />
							</div>
						</div>
					{:else}
						<p class="text-sm text-text-subtle">Ingen driftsdata ennå.</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						Hosting og vedlikehold håndteres av byrået.
					</p>
				</section>
			{/if}
		</aside>
	</div>
</div>

<PageDrawer bind:open={drawerOpen} page={editing} onsaved={afterSave} />
