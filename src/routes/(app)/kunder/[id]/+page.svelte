<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Plus from '@lucide/svelte/icons/plus';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import CustomerDrawer from '../CustomerDrawer.svelte';
	import { pb } from '$lib/pb';
	import { Collections, BookingsStatusOptions } from '$lib/pocketbase-types';
	import {
		formatDate,
		formatDateFull,
		formatKr,
		formatMonthYear,
		formatNumber,
		formatTime,
		initials
	} from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import type { PageData } from './$types';
	import type { CustomerBooking } from './+page';

	let { data }: { data: PageData } = $props();

	const customer = $derived(data.customer);
	const businessId = $derived(data.business?.id ?? '');
	const hasBooking = $derived(Boolean(data.modules?.booking));

	// --- punch card ----------------------------------------------------------
	const pc = $derived.by(() => {
		const raw = customer.punch_card;
		const goal = Math.round(Number(raw?.goal) || 0);
		if (!raw || goal <= 0) return null;
		const count = Math.min(Math.max(Math.round(Number(raw.count) || 0), 0), goal);
		return { count, goal, reward_text: raw.reward_text ?? '' };
	});
	const punchFull = $derived(pc ? pc.count >= pc.goal : false);
	const punchRemaining = $derived(pc ? pc.goal - pc.count : 0);

	let punchSaving = $state(false);
	async function writePunch(count: number) {
		if (!pc) return;
		punchSaving = true;
		try {
			await pb.collection(Collections.Customers).update(customer.id, {
				punch_card: { count, goal: pc.goal, reward_text: pc.reward_text }
			});
			await invalidateAll();
			if (count >= pc.goal) {
				toast.success(`Klippekortet er fullt! ${pc.reward_text || 'Belønning er klar.'}`);
			} else {
				toast.success('Klipp registrert.');
			}
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			punchSaving = false;
		}
	}
	function registerPunch() {
		if (!pc || punchFull) return;
		writePunch(Math.min(pc.count + 1, pc.goal));
	}
	async function resetPunch() {
		if (!pc) return;
		punchSaving = true;
		try {
			await pb.collection(Collections.Customers).update(customer.id, {
				punch_card: { count: 0, goal: pc.goal, reward_text: pc.reward_text }
			});
			await invalidateAll();
			toast.success('Klippekortet er nullstilt.');
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			punchSaving = false;
		}
	}

	// --- consents (GDPR) -----------------------------------------------------
	// Local mirror re-seeded from server data on every (re)load; toggling writes
	// the full consents JSON and sets `registered` the first time anything is
	// granted. We only ever reflect `=== true` — never imply a consent the data
	// doesn't hold.
	let emailOn = $state(false);
	let smsOn = $state(false);
	let togglingEmail = $state(false);
	let togglingSms = $state(false);

	$effect(() => {
		emailOn = customer.consents?.email === true;
		smsOn = customer.consents?.sms === true;
	});

	const registered = $derived(
		typeof customer.consents?.registered === 'string' ? customer.consents.registered : ''
	);

	async function setConsent(channel: 'email' | 'sms', next: boolean) {
		const prevEmail = emailOn;
		const prevSms = smsOn;
		if (channel === 'email') {
			emailOn = next;
			togglingEmail = true;
		} else {
			smsOn = next;
			togglingSms = true;
		}

		const consents: { email: boolean; sms: boolean; registered?: string } = {
			email: emailOn,
			sms: smsOn,
			registered: registered || undefined
		};
		// Stamp the registration date the first time a consent is granted.
		if ((emailOn || smsOn) && !consents.registered) {
			consents.registered = new Date().toISOString();
		}

		try {
			await pb.collection(Collections.Customers).update(customer.id, { consents });
			await invalidateAll();
			toast.success(
				next
					? `Samtykke til ${channel === 'email' ? 'e-post' : 'SMS'} er registrert.`
					: `Samtykke til ${channel === 'email' ? 'e-post' : 'SMS'} er trukket tilbake.`
			);
		} catch (e) {
			// Revert the optimistic toggle on failure.
			emailOn = prevEmail;
			smsOn = prevSms;
			toast.error(pbError(e));
		} finally {
			togglingEmail = false;
			togglingSms = false;
		}
	}

	// --- upcoming appointment + history --------------------------------------
	const upcoming = $derived.by(() => {
		const now = Date.now();
		return data.bookings
			.filter(
				(b) =>
					(b.status === BookingsStatusOptions.pending ||
						b.status === BookingsStatusOptions.confirmed) &&
					new Date(b.start).getTime() >= now
			)
			.sort((a, b) => a.start.localeCompare(b.start))[0];
	});

	type HistoryRow = {
		id: string;
		date: string;
		type: 'booking' | 'inquiry';
		typeLabel: string;
		detail: string;
		amount: string;
	};

	function bookingAmount(b: CustomerBooking): string {
		const product = b.expand?.product;
		if (!product || product.price_type === 'on_request' || !product.price) return '–';
		return formatKr(product.price);
	}

	const history = $derived.by<HistoryRow[]>(() => {
		const rows: HistoryRow[] = [
			...data.bookings.map((b) => ({
				id: b.id,
				date: b.start,
				type: 'booking' as const,
				typeLabel: 'Booking',
				detail: b.expand?.product?.name ?? 'Booking',
				amount: bookingAmount(b)
			})),
			...data.inquiries.map((i) => ({
				id: i.id,
				date: i.created,
				type: 'inquiry' as const,
				typeLabel: 'Henvendelse',
				detail: i.message,
				amount: '–'
			}))
		];
		return rows.sort((a, b) => b.date.localeCompare(a.date));
	});

	// --- edit ----------------------------------------------------------------
	let drawerOpen = $state(false);
	function refresh() {
		return invalidateAll();
	}

	const cardClass = 'rounded-lg border border-border bg-card p-6';
	const h3 = 'text-base font-semibold text-foreground';
	const capsLabel =
		'text-[11px] font-medium uppercase tracking-[0.06em] text-text-subtle';
</script>

<svelte:head><title>{customer.name} · Kunder · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Sidetopp -->
	<header class="flex flex-wrap items-center gap-4">
		<a
			href="/kunder"
			aria-label="Tilbake til kundelisten"
			class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-text-body outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
		>
			<ChevronLeft class="size-4" />
		</a>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-semibold text-foreground">{customer.name}</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				Kunde siden {formatMonthYear(customer.created)} · {formatNumber(customer.visit_count ?? 0)} besøk
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={() => (drawerOpen = true)}>Rediger</Button>
			{#if hasBooking}
				<Button variant="outline" href="/booking">Ny avtale</Button>
			{/if}
		</div>
	</header>

	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<!-- Venstrekolonne -->
		<div class="flex flex-col gap-6 lg:w-[384px] lg:shrink-0">
			<!-- Kontakt + samtykker -->
			<section class={cn(cardClass, 'flex flex-col gap-3')}>
				<h2 class={h3}>Kontakt</h2>
				<div class="flex items-center gap-2 text-sm text-text-body">
					<Phone class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
					{customer.phone || 'Ingen telefon'}
				</div>
				<div class="flex items-center gap-2 text-sm text-text-body">
					<Mail class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
					{customer.email || 'Ingen e-post'}
				</div>

				<div class="h-px w-full bg-border"></div>

				<p class={capsLabel}>Samtykker</p>
				<div class="flex items-center gap-3">
					<Switch
						id="consent-email"
						checked={emailOn}
						disabled={togglingEmail}
						onCheckedChange={(v) => setConsent('email', v)}
						aria-label="Samtykke til e-post"
					/>
					<label for="consent-email" class="text-sm text-text-body">
						E-post (nyhetsbrev og tilbud)
					</label>
				</div>
				<div class="flex items-center gap-3">
					<Switch
						id="consent-sms"
						checked={smsOn}
						disabled={togglingSms}
						onCheckedChange={(v) => setConsent('sms', v)}
						aria-label="Samtykke til SMS"
					/>
					<label for="consent-sms" class="text-sm text-text-body">
						SMS (påminnelser og kampanjer)
					</label>
				</div>
				{#if registered}
					<p class="text-xs text-muted-foreground">
						Samtykke registrert {formatDateFull(registered)}
					</p>
				{:else}
					<p class="text-xs text-text-subtle">Ingen samtykker registrert ennå.</p>
				{/if}
			</section>

			<!-- Klippekort -->
			<section class={cn(cardClass, 'flex flex-col gap-3')}>
				<h2 class={h3}>Klippekort</h2>
				{#if pc}
					<div class="flex items-center gap-2">
						<p class="flex-1 text-sm font-medium text-foreground">
							Klipp {pc.count} av {pc.goal}
						</p>
						{#if punchFull}
							<Badge
								class="h-[22px] gap-1.5 rounded-full border-transparent bg-success-bg px-2 text-xs font-medium text-success"
							>
								<span
									class="size-1.5 shrink-0 rounded-full bg-current opacity-80"
									aria-hidden="true"
								></span>
								Fullt!
							</Badge>
						{:else}
							<Badge
								class="h-[22px] rounded-full border-transparent bg-accent-blue-bg px-2 text-xs font-medium text-accent-blue-text"
							>
								{punchRemaining} igjen
							</Badge>
						{/if}
					</div>

					<div class="flex flex-wrap gap-2" aria-hidden="true">
						{#each Array(pc.goal) as _, i (i)}
							<span
								class={cn(
									'size-5 rounded-full border',
									i < pc.count ? 'border-foreground bg-foreground' : 'border-border bg-transparent'
								)}
							></span>
						{/each}
					</div>

					{#if pc.reward_text}
						<p class="text-xs text-muted-foreground">{pc.reward_text}</p>
					{/if}

					<div class="flex flex-wrap gap-2 pt-1">
						<Button variant="outline" onclick={registerPunch} disabled={punchSaving || punchFull}>
							<Plus class="size-4" />
							Registrer klipp
						</Button>
						{#if punchFull}
							<Button variant="outline" onclick={resetPunch} disabled={punchSaving}>
								<RotateCcw class="size-4" />
								Nullstill kort
							</Button>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-text-subtle">Kunden har ikke et klippekort ennå.</p>
					<div>
						<Button variant="outline" onclick={() => (drawerOpen = true)}>
							<Plus class="size-4" />
							Legg til klippekort
						</Button>
					</div>
				{/if}
			</section>
		</div>

		<!-- Høyrekolonne -->
		<div class="flex min-w-0 flex-1 flex-col gap-6">
			<!-- Kommende avtale -->
			{#if hasBooking}
				<section class={cn(cardClass, 'flex flex-col gap-3')}>
					<h2 class={h3}>Kommende avtale</h2>
					{#if upcoming}
						<div class="flex items-center gap-3">
							<CalendarDays class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
							<p class="flex-1 text-sm font-medium text-foreground">
								{formatDate(upcoming.start)} kl. {formatTime(upcoming.start)}
								{#if upcoming.expand?.product}
									— {upcoming.expand.product.name}
								{/if}
							</p>
							<StatusBadge collection="bookings" status={upcoming.status} />
						</div>
					{:else}
						<p class="text-sm text-text-subtle">Ingen kommende avtaler.</p>
					{/if}
				</section>
			{/if}

			<!-- Historikk -->
			<section class="overflow-hidden rounded-lg border border-border bg-card">
				<div class="px-6 pb-2 pt-6">
					<h2 class={h3}>Historikk</h2>
				</div>
				{#if history.length === 0}
					<EmptyState
						title="Ingen historikk ennå"
						description="Bookinger og henvendelser fra denne kunden dukker opp her."
						class="py-10"
					/>
				{:else}
					<table class="w-full border-collapse">
						<thead>
							<tr
								class="h-10 border-b border-border [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-muted-foreground"
							>
								<th class="w-[120px]">Dato</th>
								<th class="w-[140px]">Type</th>
								<th>Detaljer</th>
								<th class="w-[110px]"><div class="text-right">Beløp</div></th>
							</tr>
						</thead>
						<tbody>
							{#each history as row (row.id)}
								<tr
									class="h-12 border-b border-border last:border-b-0 [&>td]:px-4 [&>td]:align-middle [&>td]:text-sm [&>td]:text-text-body"
								>
									<td class="whitespace-nowrap">{formatDate(row.date)}</td>
									<td>
										<Badge
											class={cn(
												'h-[22px] rounded-full border-transparent px-2 text-xs font-medium',
												row.type === 'inquiry'
													? 'bg-warning-bg text-warning'
													: 'bg-muted text-muted-foreground'
											)}
										>
											{row.typeLabel}
										</Badge>
									</td>
									<td class="max-w-0 truncate" title={row.detail}>{row.detail}</td>
									<td class="whitespace-nowrap text-right tabular-nums">
										{#if row.amount === '–'}
											<span class="text-text-subtle">–</span>
										{:else}
											{row.amount}
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		</div>
	</div>
</div>

<CustomerDrawer bind:open={drawerOpen} {customer} {businessId} onsaved={refresh} />
