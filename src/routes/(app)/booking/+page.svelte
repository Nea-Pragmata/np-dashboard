<script lang="ts">
	import { navigating, page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Search from '@lucide/svelte/icons/search';
	import Inbox from '@lucide/svelte/icons/inbox';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import DataTable from '$lib/components/shared/DataTable.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import WeekCalendar from './WeekCalendar.svelte';
	import BookingDrawer from './BookingDrawer.svelte';
	import { pb } from '$lib/pb';
	import { Collections, BookingsStatusOptions } from '$lib/pocketbase-types';
	import { formatDate, formatTime } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import type { TableState } from '$lib/types';
	import {
		weekStart,
		addDays,
		isoDate,
		parseIsoDate,
		minutesOfDay,
		hhmmToMinutes,
		isoWeekNumber,
		DAY_KEYS,
		type OpeningHours
	} from './week';
	import type { PageData } from './$types';
	import type { WeekBooking } from './+page';

	let { data }: { data: PageData } = $props();

	const bookings = $derived(data.bookings);
	const businessId = $derived(data.business?.id ?? '');
	const businessName = $derived(data.business?.name ?? 'bedriften');
	const openingHours = $derived((data.business?.opening_hours ?? {}) as OpeningHours);

	// --- view toggle ---------------------------------------------------------
	// Kalender/Avtaler are in-page state; Innstillinger is a sibling route
	// (/booking/innstillinger). `?fane=avtaler` lets that route link back to the
	// Avtaler view (read once on entry — later toggles stay pure client state).
	type Tab = 'kalender' | 'avtaler';
	let activeTab = $state<Tab>(
		page.url.searchParams.get('fane') === 'avtaler' ? 'avtaler' : 'kalender'
	);
	const TABS: { value: Tab; label: string }[] = [
		{ value: 'kalender', label: 'Kalender' },
		{ value: 'avtaler', label: 'Avtaler' }
	];

	// --- week model (all UTC, see week.ts) -----------------------------------
	const monday = $derived(parseIsoDate(data.weekStartIso) ?? weekStart(new Date()));
	const todayIso = isoDate(new Date());

	const weekdayFmt = new Intl.DateTimeFormat('nb-NO', { weekday: 'short', timeZone: 'UTC' });
	const rangeFmt = new Intl.DateTimeFormat('nb-NO', {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});

	const days = $derived(
		Array.from({ length: 7 }, (_, i) => {
			const d = addDays(monday, i);
			const iso = isoDate(d);
			const wd = weekdayFmt.format(d).replace('.', '').toUpperCase();
			return { date: d, iso, label: `${wd} ${d.getUTCDate()}.`, isToday: iso === todayIso };
		})
	);
	const weekLabel = $derived(
		`Uke ${isoWeekNumber(monday)} · ${rangeFmt.format(monday)} – ${rangeFmt.format(addDays(monday, 6))}`
	);

	// Grid hour range = union of the week's opening hours and its bookings.
	const hourRange = $derived.by(() => {
		let min = Infinity;
		let max = -Infinity;
		for (const key of DAY_KEYS) {
			const day = openingHours?.[key];
			const open = hhmmToMinutes(day?.open);
			const close = hhmmToMinutes(day?.close);
			if (open != null) min = Math.min(min, open);
			if (close != null) max = Math.max(max, close);
		}
		for (const b of bookings) {
			min = Math.min(min, minutesOfDay(new Date(b.start)));
			max = Math.max(max, minutesOfDay(new Date(b.end)));
		}
		if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
			min = 8 * 60;
			max = 18 * 60;
		}
		return { startHour: Math.max(0, Math.floor(min / 60)), endHour: Math.min(24, Math.ceil(max / 60)) };
	});

	// --- filters (shared by both views) --------------------------------------
	let staffFilter = $state('all');
	let q = $state('');
	let statusFilter = $state('all');

	const STATUS_FILTERS = [
		{ value: 'all', label: 'Alle' },
		{ value: BookingsStatusOptions.pending, label: 'Venter' },
		{ value: BookingsStatusOptions.confirmed, label: 'Bekreftet' },
		{ value: BookingsStatusOptions.done, label: 'Fullført' },
		{ value: BookingsStatusOptions.cancelled, label: 'Avlyst' }
	];
	const statusFilterLabel = $derived(
		STATUS_FILTERS.find((s) => s.value === statusFilter)?.label ?? 'Alle'
	);
	const staffFilterLabel = $derived(
		staffFilter === 'all'
			? 'Alle ansatte'
			: (data.staff.find((s) => s.id === staffFilter)?.name ?? 'Alle ansatte')
	);

	const calendarBookings = $derived(
		staffFilter === 'all' ? bookings : bookings.filter((b) => b.staff === staffFilter)
	);
	const listBookings = $derived(
		bookings.filter((b) => {
			if (staffFilter !== 'all' && b.staff !== staffFilter) return false;
			if (statusFilter !== 'all' && b.status !== statusFilter) return false;
			const query = q.trim().toLowerCase();
			if (query && !(b.customer_name ?? '').toLowerCase().includes(query)) return false;
			return true;
		})
	);

	// --- table lifecycle -----------------------------------------------------
	const isLoading = $derived(
		Boolean(navigating.to) && navigating.to?.url.pathname === '/booking'
	);
	const tableState = $derived<TableState<WeekBooking>>({
		status: isLoading ? 'loading' : 'ready',
		items: listBookings
	});

	// Week is truly empty (drives the calendar's centered empty overlay).
	const weekEmpty = $derived(bookings.length === 0);
	// Header «Ny avtale» is the single black primary EXCEPT on the empty calendar,
	// where the centered CTA takes that role (maks én svart primærknapp).
	const headerPrimary = $derived(!(activeTab === 'kalender' && weekEmpty));

	// --- week navigation -----------------------------------------------------
	function goToWeek(iso: string) {
		goto(`/booking?uke=${iso}`, { keepFocus: true, noScroll: true });
	}
	const goPrev = () => goToWeek(isoDate(addDays(monday, -7)));
	const goNext = () => goToWeek(isoDate(addDays(monday, 7)));
	const goToday = () => goToWeek(isoDate(weekStart(new Date())));

	// --- realtime ------------------------------------------------------------
	// Subscribe to this tenant's bookings; re-run just this load on any change.
	// Re-subscribes when the business id changes; cleans up on teardown.
	$effect(() => {
		const bid = businessId;
		if (!bid) return;
		let active = true;
		let unsub: (() => void) | undefined;
		pb.collection(Collections.Bookings)
			.subscribe(
				'*',
				() => {
					if (active) invalidate('app:bookings');
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

	// --- drawer + mutations --------------------------------------------------
	let drawerOpen = $state(false);
	let editingBooking = $state<WeekBooking | null>(null);

	function openNew() {
		editingBooking = null;
		drawerOpen = true;
	}
	function openBooking(b: WeekBooking) {
		editingBooking = b;
		drawerOpen = true;
	}
	function refresh() {
		return invalidate('app:bookings');
	}

	async function setBookingStatus(b: WeekBooking, status: BookingsStatusOptions, message: string) {
		try {
			await pb.collection(Collections.Bookings).update(b.id, { status });
			toast.success(message);
			await refresh();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	// Default date for a new booking: today if it falls inside the viewed week,
	// otherwise the Monday of that week.
	const newBookingDate = $derived(
		todayIso >= days[0].iso && todayIso <= days[6].iso ? todayIso : days[0].iso
	);

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Booking · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Booking</h1>
			<p class="mt-1 text-sm text-muted-foreground">Timene og avtalene for {businessName}.</p>
		</div>
		<Button variant={headerPrimary ? 'default' : 'outline'} onclick={openNew}>
			<Plus class="size-4" />
			Ny avtale
		</Button>
	</header>

	<!-- Faner -->
	<div class="flex gap-6 border-b border-border">
		{#each TABS as t (t.value)}
			<button
				type="button"
				onclick={() => (activeTab = t.value)}
				aria-current={activeTab === t.value ? 'page' : undefined}
				class={cn(
					'relative -mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
					activeTab === t.value
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}
			>
				{t.label}
			</button>
		{/each}
		<a
			href="/booking/innstillinger"
			class="relative -mb-px border-b-2 border-transparent px-1 pb-3 pt-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		>
			Innstillinger
		</a>
	</div>

	<!-- Verktøylinje: ukenavigator + ansatt-filter -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={goToday}>I dag</Button>
			<div class="flex items-center">
				<Button variant="outline" size="icon" class="rounded-r-none" aria-label="Forrige uke" onclick={goPrev}>
					<ChevronLeft class="size-4" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					class="-ml-px rounded-l-none"
					aria-label="Neste uke"
					onclick={goNext}
				>
					<ChevronRight class="size-4" />
				</Button>
			</div>
			<span class="ml-1 text-sm font-medium text-foreground">{weekLabel}</span>
		</div>
		<Select.Root type="single" bind:value={staffFilter}>
			<Select.Trigger class="w-[180px]" aria-label="Filtrer på ansatt">{staffFilterLabel}</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="Alle ansatte">Alle ansatte</Select.Item>
				{#each data.staff as s (s.id)}
					<Select.Item value={s.id} label={s.name}>{s.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if activeTab === 'kalender'}
		<!-- KALENDER -->
		{#if isLoading}
			<div class="rounded-xl border border-border bg-card p-4">
				<div class="grid gap-2" style="grid-template-columns: 52px repeat(7, 1fr);">
					{#each Array(8 * 7) as _, i (i)}
						<Skeleton class="h-10 w-full" />
					{/each}
				</div>
			</div>
		{:else}
			<div class="relative rounded-xl border border-border bg-card">
				<WeekCalendar
					{days}
					bookings={calendarBookings}
					startHour={hourRange.startHour}
					endHour={hourRange.endHour}
					onselect={openBooking}
				/>
				{#if weekEmpty}
					<div class="pointer-events-none absolute inset-x-0 bottom-0 top-[42px] flex items-center justify-center p-4">
						<div class="pointer-events-auto max-w-xs">
							<EmptyState
								icon={Inbox}
								title="Ingen avtaler denne uken"
								description="Del bookinglenken din, så kan kundene bestille selv."
								action={emptyCta}
							/>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<!-- AVTALER -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="relative sm:max-w-xs sm:flex-1">
				<Search
					class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
				/>
				<Input
					name="booking-sok"
					type="search"
					aria-label="Søk på kunde"
					placeholder="Søk på kunde …"
					bind:value={q}
					class="pl-9"
				/>
			</div>
			<Select.Root type="single" bind:value={statusFilter}>
				<Select.Trigger class="sm:w-[170px]">Status: {statusFilterLabel}</Select.Trigger>
				<Select.Content>
					{#each STATUS_FILTERS as s (s.value)}
						<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<DataTable
			state={tableState}
			columns={6}
			onRetry={refresh}
			empty={bookings.length === 0
				? {
						icon: Inbox,
						title: 'Ingen avtaler denne uken',
						description: 'Del bookinglenken din, så kan kundene bestille selv.',
						action: emptyCta
					}
				: {
						icon: Search,
						title: 'Ingen treff',
						description: 'Prøv et annet søk eller filter.'
					}}
		>
			{#snippet header()}
				<th>Tid</th>
				<th>Kunde</th>
				<th>Tjeneste</th>
				<th>Ansatt</th>
				<th>Status</th>
				<th class="w-[52px]"><span class="sr-only">Handlinger</span></th>
			{/snippet}
			{#snippet row(b)}
				<td class="whitespace-nowrap font-medium text-foreground">
					{formatDate(b.start)}
					{formatTime(b.start)}
				</td>
				<td class="text-foreground">{b.customer_name || '—'}</td>
				<td class="text-muted-foreground">{b.expand?.product?.name ?? '—'}</td>
				<td class="text-muted-foreground">{b.expand?.staff?.name ?? '—'}</td>
				<td><StatusBadge collection="bookings" status={b.status} /></td>
				<td>
					<div class="flex justify-end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								class={triggerClass}
								aria-label="Handlinger for {b.customer_name || 'avtale'}"
							>
								<Ellipsis class="size-4" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Item onSelect={() => openBooking(b)}>Åpne</DropdownMenu.Item>
								{#if b.status === BookingsStatusOptions.pending}
									<DropdownMenu.Item
										onSelect={() =>
											setBookingStatus(b, BookingsStatusOptions.confirmed, 'Avtalen er bekreftet.')}
									>
										Bekreft
									</DropdownMenu.Item>
								{/if}
								{#if b.status === BookingsStatusOptions.confirmed}
									<DropdownMenu.Item
										onSelect={() =>
											setBookingStatus(b, BookingsStatusOptions.done, 'Avtalen er fullført.')}
									>
										Fullført
									</DropdownMenu.Item>
								{/if}
								{#if b.status !== BookingsStatusOptions.cancelled && b.status !== BookingsStatusOptions.done}
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive data-highlighted:text-destructive"
										onSelect={() =>
											setBookingStatus(b, BookingsStatusOptions.cancelled, 'Avtalen er avlyst.')}
									>
										Avlys
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</td>
			{/snippet}
		</DataTable>
	{/if}
</div>

{#snippet emptyCta()}
	<Button onclick={openNew}>
		<Plus class="size-4" />
		Ny avtale
	</Button>
{/snippet}

<BookingDrawer
	bind:open={drawerOpen}
	booking={editingBooking}
	products={data.products}
	staff={data.staff}
	resources={data.resources}
	customers={data.customers}
	{businessId}
	defaultDateIso={newBookingDate}
	onsaved={refresh}
/>
