<script lang="ts">
	import { navigating } from '$app/state';
	import Inbox from '@lucide/svelte/icons/inbox';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Star from '@lucide/svelte/icons/star';
	import Plus from '@lucide/svelte/icons/plus';
	import Package from '@lucide/svelte/icons/package';
	import Send from '@lucide/svelte/icons/send';
	import Clock from '@lucide/svelte/icons/clock';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check-big';
	import { auth } from '$lib/stores/auth.svelte';
	import { hasAnyModule } from '$lib/utils/modules';
	import { formatTime } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const modules = $derived(data.modules);
	const stats = $derived(data.stats);
	const anyModule = $derived(hasAnyModule(modules));

	const firstName = $derived((auth.user?.name ?? '').trim().split(/\s+/)[0] ?? '');
	// Long-weekday prose date for the greeting ("tirsdag 7. juli").
	const todayLabel = new Intl.DateTimeFormat('nb-NO', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(new Date());

	// KPI cards, in Figma order. Besøk + Klikk are website metrics shown to every
	// tenant; Bookinger/Nye henvendelser only when the module is enabled.
	const kpis = $derived(
		[
			{ label: 'Besøk', value: stats?.visits_30d ?? 0, show: true },
			{ label: 'Bookinger', value: stats?.bookings_30d ?? 0, show: Boolean(modules.booking) },
			{
				label: 'Nye henvendelser',
				value: stats?.new_inquiries ?? 0,
				show: Boolean(modules.inquiries)
			},
			{ label: 'Klikk på lenker', value: stats?.clicks_30d ?? 0, show: true }
		].filter((k) => k.show)
	);

	// "Krever handling" follow-ups — only rows with something to act on appear.
	const newInquiries = $derived(modules.inquiries ? (stats?.new_inquiries ?? 0) : 0);
	const pendingBookings = $derived(
		modules.booking ? (data.todayBookings ?? []).filter((b) => b.status === 'pending').length : 0
	);
	const newReviews = $derived(modules.reviews ? (data.newReviewsCount ?? 0) : 0);

	const followups = $derived([
		...(newInquiries > 0
			? [
					{
						icon: Inbox,
						text: `${newInquiries} ${newInquiries === 1 ? 'ny henvendelse' : 'nye henvendelser'} å svare på`,
						href: '/henvendelser',
						cta: 'Svar'
					}
				]
			: []),
		...(pendingBookings > 0
			? [
					{
						icon: CalendarDays,
						text: `${pendingBookings} booking${pendingBookings === 1 ? '' : 'er'} venter på bekreftelse`,
						href: '/booking',
						cta: 'Bekreft'
					}
				]
			: []),
		...(newReviews > 0
			? [
					{
						icon: Star,
						text: `${newReviews} ${newReviews === 1 ? 'ny anmeldelse' : 'nye anmeldelser'} å svare på`,
						href: '/anmeldelser',
						cta: 'Svar'
					}
				]
			: [])
	]);

	// Quick actions. "Rediger åpningstider" is always available; the rest gate on
	// their module so a pure-website tenant only sees what's actionable.
	const quickActions = $derived([
		...(modules.booking ? [{ icon: Plus, label: 'Ny avtale', href: '/booking' }] : []),
		...(modules.catalog ? [{ icon: Package, label: 'Nytt produkt', href: '/katalog' }] : []),
		...(modules.campaigns ? [{ icon: Send, label: 'Send kampanje', href: '/markedsforing' }] : []),
		{ icon: Clock, label: 'Rediger åpningstider', href: '/innstillinger' }
	]);

	// Website health ("Drift"), derived from site_status → StatusBadge states.
	const site = $derived(data.siteStatus);
	function uptimeState(uptime: number | undefined): string {
		if (uptime == null) return 'unknown';
		if (uptime >= 99.5) return 'ok';
		if (uptime >= 98) return 'warning';
		return 'error';
	}
	const driftRows = $derived([
		{ label: 'Nettsted', status: uptimeState(site?.uptime) },
		{ label: 'Domene', status: site?.ssl_status ?? 'unknown' },
		{ label: 'Sikkerhetskopi', status: site?.last_backup ? 'ok' : 'missing' }
	]);

	// Today's schedule — upcoming/active appointments (drop done + cancelled).
	const appointments = $derived(
		(data.todayBookings ?? []).filter((b) => b.status !== 'done' && b.status !== 'cancelled')
	);

	const isLoading = $derived(!!navigating.to && navigating.to.url.pathname === '/oversikt');
</script>

<svelte:head><title>Oversikt · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	{#if isLoading}
		<!-- Loading skeleton (navigation into Oversikt) -->
		<div class="flex flex-col gap-2">
			<Skeleton class="h-8 w-64" />
			<Skeleton class="h-4 w-80" />
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each Array(4) as _, i (i)}
				<Skeleton class="h-[120px] rounded-lg" />
			{/each}
		</div>
		<div class="grid gap-6 lg:grid-cols-3">
			<Skeleton class="h-64 rounded-lg lg:col-span-2" />
			<Skeleton class="h-64 rounded-lg" />
		</div>
	{:else}
		<!-- Greeting -->
		<header class="flex flex-wrap items-start gap-4">
			<div class="min-w-0 flex-1">
				<h1 class="text-2xl font-semibold text-foreground">
					God morgen{firstName ? `, ${firstName}` : ''}
				</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					Her er status for {data.business?.name ?? 'bedriften din'} i dag, {todayLabel}.
				</p>
			</div>
			{#if anyModule}
				<Button href="/statistikk" variant="outline" size="lg">Se full statistikk</Button>
			{/if}
		</header>

		<!-- KPI-er -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each kpis as kpi (kpi.label)}
				<KpiCard label={kpi.label} value={kpi.value} />
			{/each}
		</div>

		<!-- Krever handling + høyre kolonne -->
		<div class="grid gap-6 lg:grid-cols-3">
			<section class="rounded-lg border border-border bg-card p-5 lg:col-span-2">
				<h2 class="text-lg font-semibold text-foreground">Krever handling</h2>
				{#if followups.length > 0}
					<ul class="mt-2 flex flex-col">
						{#each followups as f (f.href)}
							{@const Icon = f.icon}
							<li
								class="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
							>
								<span
									class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-text-body"
								>
									<Icon class="size-4" />
								</span>
								<p class="min-w-0 flex-1 text-sm text-text-body">{f.text}</p>
								<Button href={f.href} variant="ghost" size="sm">{f.cta}</Button>
							</li>
						{/each}
					</ul>
				{:else}
					<EmptyState
						icon={CircleCheck}
						title="Alt er à jour"
						description="Ingen oppgaver krever handling akkurat nå."
					/>
				{/if}
			</section>

			<div class="flex flex-col gap-6">
				<!-- Snarveier -->
				<section class="rounded-lg border border-border bg-card p-5">
					<h2 class="text-lg font-semibold text-foreground">Snarveier</h2>
					<ul class="mt-2 flex flex-col">
						{#each quickActions as q (q.href)}
							{@const Icon = q.icon}
							<li class="border-b border-border last:border-b-0">
								<a
									href={q.href}
									class="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 text-sm text-text-body transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<Icon class="size-4 shrink-0 text-text-subtle" />
									<span class="min-w-0 flex-1 truncate">{q.label}</span>
									<ChevronRight class="size-4 shrink-0 text-text-subtle" />
								</a>
							</li>
						{/each}
					</ul>
				</section>

				<!-- Drift / nettstedstatus -->
				<section class="rounded-lg border border-border bg-card p-5">
					<h2 class="text-lg font-semibold text-foreground">Drift</h2>
					<ul class="mt-2 flex flex-col">
						{#each driftRows as row (row.label)}
							<li class="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
								<span class="min-w-0 flex-1 text-sm text-text-body">{row.label}</span>
								<StatusBadge collection="site_status" status={row.status} />
							</li>
						{/each}
					</ul>
				</section>
			</div>
		</div>

		<!-- Dagens avtaler -->
		{#if modules.booking}
			<section class="rounded-lg border border-border bg-card p-5">
				<div class="flex flex-wrap items-center gap-4">
					<h2 class="min-w-0 flex-1 text-lg font-semibold text-foreground">Dagens avtaler</h2>
					<Button href="/booking" variant="outline" size="lg">Åpne kalenderen</Button>
				</div>
				{#if appointments.length > 0}
					<ul class="mt-2 flex flex-col">
						{#each appointments as b (b.id)}
							{@const name = b.customer_name || b.expand?.customer?.name || 'Kunde'}
							{@const service = b.expand?.product?.name ?? '—'}
							<li
								class="flex items-center gap-3 border-b border-border py-3 last:border-b-0 sm:gap-4"
							>
								<span class="w-14 shrink-0 text-sm font-medium tabular-nums text-foreground">
									{formatTime(b.start)}
								</span>
								<span class="w-36 shrink-0 truncate text-sm text-text-body sm:w-48">{name}</span>
								<span class="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
									{service}
								</span>
								<StatusBadge collection="bookings" status={b.status} class="ml-auto" />
							</li>
						{/each}
					</ul>
				{:else}
					<EmptyState
						icon={CalendarDays}
						title="Ingen avtaler i dag"
						description="Dagen er åpen — nye bookinger dukker opp her."
					/>
				{/if}
			</section>
		{/if}
	{/if}
</div>
