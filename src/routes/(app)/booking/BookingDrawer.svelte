<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import CheckCircle from '@lucide/svelte/icons/circle-check';
	import CircleCheckBig from '@lucide/svelte/icons/circle-check-big';
	import XCircle from '@lucide/svelte/icons/circle-x';
	import { toast } from 'svelte-sonner';
	import posthog from 'posthog-js';
	import { pb } from '$lib/pb';
	import {
		Collections,
		BookingsStatusOptions,
		BookingsDepositStatusOptions,
		type ProductsResponse,
		type UsersResponse,
		type ResourcesResponse,
		type CustomersResponse
	} from '$lib/pocketbase-types';
	import { formatDate, formatTime, formatKr } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { cn } from '$lib/utils.js';
	import type { WeekBooking } from './+page';

	let {
		open = $bindable(false),
		booking = null,
		products,
		staff,
		resources,
		customers,
		businessId,
		defaultDateIso,
		onsaved
	}: {
		open?: boolean;
		/** The booking being viewed/edited, or `null` to create a new one. */
		booking?: WeekBooking | null;
		products: ProductsResponse[];
		staff: UsersResponse[];
		resources: ResourcesResponse[];
		customers: CustomersResponse[];
		businessId: string;
		/** Pre-filled date (YYYY-MM-DD) for a new booking. */
		defaultDateIso: string;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(booking));

	// --- form working copy ---------------------------------------------------
	let productId = $state('');
	let dateIso = $state('');
	let startTime = $state('09:00');
	let endTime = $state('10:00');
	let customerName = $state('');
	let customerPhone = $state('');
	let customerEmail = $state('');
	let staffId = $state('');
	let resourceId = $state('');
	let customerId = $state(''); // edit-only: link an existing customer
	let notes = $state('');
	let saving = $state(false);

	let productError = $state('');
	let dateError = $state('');
	let timeError = $state('');
	let nameError = $state('');

	const NONE = '__none__'; // Select sentinel for "no staff / resource / customer"

	// Re-seed the working copy each time the drawer opens (keyed on booking id so
	// it never fights in-progress edits).
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = booking?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;

		if (booking) {
			productId = booking.product;
			dateIso = new Date(booking.start).toISOString().slice(0, 10);
			startTime = formatTime(booking.start);
			endTime = formatTime(booking.end);
			customerName = booking.customer_name ?? '';
			customerPhone = booking.customer_phone ?? '';
			customerEmail = booking.customer_email ?? '';
			staffId = booking.staff || '';
			resourceId = booking.resource || '';
			customerId = booking.customer || '';
			notes = booking.notes ?? '';
		} else {
			productId = '';
			dateIso = defaultDateIso;
			startTime = '09:00';
			endTime = '10:00';
			customerName = '';
			customerPhone = '';
			customerEmail = '';
			staffId = '';
			resourceId = '';
			customerId = '';
			notes = '';
		}
		productError = dateError = timeError = nameError = '';
	});

	const selectedProduct = $derived(products.find((p) => p.id === productId));
	const staffLabel = $derived(staff.find((s) => s.id === staffId)?.name ?? 'Ingen ansatt');
	const resourceLabel = $derived(
		resources.find((r) => r.id === resourceId)?.name ?? 'Ingen ressurs'
	);
	const customerLabel = $derived(
		customers.find((c) => c.id === customerId)?.name ?? 'Ingen kobling'
	);

	// The booking's deposit is read-only in the dashboard (set by the Vipps hook).
	const depositLabel: Record<string, string> = {
		[BookingsDepositStatusOptions.not_required]: 'Ikke påkrevd',
		[BookingsDepositStatusOptions.pending]: 'Venter',
		[BookingsDepositStatusOptions.paid]: 'Betalt',
		[BookingsDepositStatusOptions.refunded]: 'Refundert'
	};
	const showDeposit = $derived(
		Boolean(booking?.deposit_status) &&
			booking?.deposit_status !== BookingsDepositStatusOptions.not_required
	);

	function addMinutes(hhmm: string, mins: number): string {
		const [h, m] = hhmm.split(':').map(Number);
		const total = h * 60 + m + mins;
		const hh = Math.floor((total % 1440) / 60);
		const mm = total % 60;
		return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	}

	// When picking a product on a NEW booking, pre-fill the end time from the
	// product's `varighet_min` attribute if it has one (frisør services do).
	function onProductChange(id: string) {
		productId = id;
		productError = '';
		if (editing) return;
		const attrs = (selectedProduct?.attributes ?? {}) as Record<string, unknown>;
		const duration = attrs.varighet_min;
		if (typeof duration === 'number' && duration > 0) {
			endTime = addMinutes(startTime, duration);
		}
	}

	function toIso(date: string, time: string): string {
		// Store wall-clock literally as UTC (see docs/LEDGER.md), so what the user
		// types (09:00) round-trips through formatTime unchanged.
		return `${date}T${time}:00.000Z`;
	}

	async function createBooking() {
		productError = productId ? '' : 'Velg en tjeneste.';
		dateError = dateIso ? '' : 'Velg en dato.';
		nameError = customerName.trim() ? '' : 'Skriv inn navn på kunden.';
		timeError = startTime && endTime && endTime > startTime ? '' : 'Sluttid må være etter starttid.';
		if (productError || dateError || nameError || timeError) return;

		saving = true;
		// Public create rule: status MUST be pending and customer/deposit/payment
		// MUST be unset. Customer is denormalised onto the text fields.
		const payload: Record<string, unknown> = {
			business: businessId,
			product: productId,
			start: toIso(dateIso, startTime),
			end: toIso(dateIso, endTime),
			status: BookingsStatusOptions.pending,
			customer_name: customerName.trim()
		};
		if (customerPhone.trim()) payload.customer_phone = customerPhone.trim();
		if (customerEmail.trim()) payload.customer_email = customerEmail.trim();
		if (staffId) payload.staff = staffId;
		if (resourceId) payload.resource = resourceId;
		if (notes.trim()) payload.notes = notes.trim();

		try {
			const created = await pb.collection(Collections.Bookings).create(payload);
			posthog.capture('booking_created', { booking_id: created.id });
			toast.success('Avtalen er opprettet.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	async function saveDetails() {
		if (!booking) return;
		saving = true;
		// Owner/staff update: NEVER send business / deposit_* / payment_*.
		const payload: Record<string, unknown> = {
			staff: staffId,
			resource: resourceId,
			customer: customerId,
			notes: notes.trim()
		};
		try {
			await pb.collection(Collections.Bookings).update(booking.id, payload);
			toast.success('Avtalen er lagret.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	async function setStatus(status: BookingsStatusOptions, message: string) {
		if (!booking) return;
		saving = true;
		try {
			await pb.collection(Collections.Bookings).update(booking.id, { status });
			toast.success(message);
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	const sectionLabel =
		'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
	const infoRow = 'flex items-start justify-between gap-4 text-sm';
</script>

<Drawer
	bind:open
	title={editing ? 'Avtale' : 'Ny avtale'}
	description={editing
		? 'Se og oppdater avtalen.'
		: 'Legg inn en avtale manuelt. Kunden får status «venter» til du bekrefter.'}
>
	{#if editing && booking}
		<!-- ============ VIEW / EDIT ============ -->
		<div class="flex flex-col gap-6">
			<!-- Summary -->
			<div class="flex flex-col gap-3 rounded-lg border border-border p-4">
				<div class="flex items-center justify-between gap-3">
					<span class="text-base font-semibold text-foreground">
						{booking.customer_name || 'Uten navn'}
					</span>
					<StatusBadge collection="bookings" status={booking.status} />
				</div>
				<div class="flex flex-col gap-1.5 border-t border-border pt-3">
					<div class={infoRow}>
						<span class="text-muted-foreground">Tjeneste</span>
						<span class="text-right font-medium text-foreground"
							>{booking.expand?.product?.name ?? '—'}</span
						>
					</div>
					<div class={infoRow}>
						<span class="text-muted-foreground">Tid</span>
						<span class="text-right font-medium text-foreground">
							{formatDate(booking.start)}, {formatTime(booking.start)}–{formatTime(booking.end)}
						</span>
					</div>
					{#if booking.customer_phone}
						<div class={infoRow}>
							<span class="text-muted-foreground">Telefon</span>
							<span class="text-right text-foreground">{booking.customer_phone}</span>
						</div>
					{/if}
					{#if booking.customer_email}
						<div class={infoRow}>
							<span class="text-muted-foreground">E-post</span>
							<span class="text-right break-all text-foreground">{booking.customer_email}</span>
						</div>
					{/if}
					{#if showDeposit && booking.deposit_status}
						<div class={infoRow}>
							<span class="text-muted-foreground">Depositum</span>
							<span class="text-right text-foreground">
								{depositLabel[booking.deposit_status] ?? booking.deposit_status}
								{#if booking.deposit_amount}· {formatKr(booking.deposit_amount)}{/if}
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Status actions -->
			{#if booking.status === BookingsStatusOptions.pending || booking.status === BookingsStatusOptions.confirmed}
				<div class="flex flex-col gap-2">
					<p class={sectionLabel}>Status</p>
					<div class="flex flex-wrap gap-2">
						{#if booking.status === BookingsStatusOptions.pending}
							<Button
								variant="outline"
								size="sm"
								disabled={saving}
								onclick={() => setStatus(BookingsStatusOptions.confirmed, 'Avtalen er bekreftet.')}
							>
								<CheckCircle class="size-4" />
								Bekreft
							</Button>
						{/if}
						{#if booking.status === BookingsStatusOptions.confirmed}
							<Button
								variant="outline"
								size="sm"
								disabled={saving}
								onclick={() => setStatus(BookingsStatusOptions.done, 'Avtalen er fullført.')}
							>
								<CircleCheckBig class="size-4" />
								Fullført
							</Button>
						{/if}
						<Button
							variant="outline"
							size="sm"
							disabled={saving}
							class="text-destructive hover:text-destructive"
							onclick={() => setStatus(BookingsStatusOptions.cancelled, 'Avtalen er avlyst.')}
						>
							<XCircle class="size-4" />
							Avlys
						</Button>
					</div>
				</div>
			{/if}

			<!-- Editable assignment -->
			<div class="flex flex-col gap-4">
				<Field.Field>
					<Field.Label for="b-staff">Ansatt</Field.Label>
					<Select.Root
						type="single"
						value={staffId || NONE}
						onValueChange={(v) => (staffId = v === NONE ? '' : v)}
					>
						<Select.Trigger id="b-staff" class="w-full">{staffLabel}</Select.Trigger>
						<Select.Content>
							<Select.Item value={NONE} label="Ingen ansatt">Ingen ansatt</Select.Item>
							{#each staff as s (s.id)}
								<Select.Item value={s.id} label={s.name}>{s.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>

				{#if resources.length > 0}
					<Field.Field>
						<Field.Label for="b-resource">Ressurs</Field.Label>
						<Select.Root
							type="single"
							value={resourceId || NONE}
							onValueChange={(v) => (resourceId = v === NONE ? '' : v)}
						>
							<Select.Trigger id="b-resource" class="w-full">{resourceLabel}</Select.Trigger>
							<Select.Content>
								<Select.Item value={NONE} label="Ingen ressurs">Ingen ressurs</Select.Item>
								{#each resources as r (r.id)}
									<Select.Item value={r.id} label={r.name}>{r.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}

				{#if customers.length > 0}
					<Field.Field>
						<Field.Label for="b-customer">Koble til kunde</Field.Label>
						<Select.Root
							type="single"
							value={customerId || NONE}
							onValueChange={(v) => (customerId = v === NONE ? '' : v)}
						>
							<Select.Trigger id="b-customer" class="w-full">{customerLabel}</Select.Trigger>
							<Select.Content>
								<Select.Item value={NONE} label="Ingen kobling">Ingen kobling</Select.Item>
								{#each customers as c (c.id)}
									<Select.Item value={c.id} label={c.name}>{c.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}

				<Field.Field>
					<Field.Label for="b-notes">Notat</Field.Label>
					<Textarea id="b-notes" bind:value={notes} rows={3} placeholder="Intern kommentar." />
				</Field.Field>
			</div>
		</div>
	{:else}
		<!-- ============ CREATE ============ -->
		<div class="flex flex-col gap-5">
			<Field.Field data-invalid={productError ? 'true' : undefined}>
				<Field.Label for="b-product">Tjeneste<span class="text-destructive"> *</span></Field.Label>
				<Select.Root type="single" value={productId} onValueChange={onProductChange}>
					<Select.Trigger id="b-product" class="w-full" aria-invalid={Boolean(productError)}>
						<span class={cn(!selectedProduct && 'text-muted-foreground')}>
							{selectedProduct?.name ?? 'Velg tjeneste …'}
						</span>
					</Select.Trigger>
					<Select.Content>
						{#each products as p (p.id)}
							<Select.Item value={p.id} label={p.name}>{p.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if productError}<Field.Error>{productError}</Field.Error>{/if}
			</Field.Field>

			<Field.Field data-invalid={dateError ? 'true' : undefined}>
				<Field.Label for="b-date">Dato<span class="text-destructive"> *</span></Field.Label>
				<Input
					id="b-date"
					type="date"
					bind:value={dateIso}
					aria-invalid={Boolean(dateError)}
					oninput={() => (dateError = '')}
				/>
				{#if dateError}<Field.Error>{dateError}</Field.Error>{/if}
			</Field.Field>

			<div class="grid grid-cols-2 gap-4">
				<Field.Field data-invalid={timeError ? 'true' : undefined}>
					<Field.Label for="b-start">Fra<span class="text-destructive"> *</span></Field.Label>
					<Input
						id="b-start"
						type="time"
						bind:value={startTime}
						aria-invalid={Boolean(timeError)}
						oninput={() => (timeError = '')}
					/>
				</Field.Field>
				<Field.Field data-invalid={timeError ? 'true' : undefined}>
					<Field.Label for="b-end">Til<span class="text-destructive"> *</span></Field.Label>
					<Input
						id="b-end"
						type="time"
						bind:value={endTime}
						aria-invalid={Boolean(timeError)}
						oninput={() => (timeError = '')}
					/>
				</Field.Field>
			</div>
			{#if timeError}<p class="-mt-3 text-sm text-destructive">{timeError}</p>{/if}

			<!-- Kunde -->
			<div class="flex flex-col gap-4 border-t border-border pt-4">
				<p class={sectionLabel}>Kunde</p>
				<Field.Field data-invalid={nameError ? 'true' : undefined}>
					<Field.Label for="b-name">Navn<span class="text-destructive"> *</span></Field.Label>
					<Input
						id="b-name"
						bind:value={customerName}
						placeholder="F.eks. Kari Nordmann"
						aria-invalid={Boolean(nameError)}
						oninput={() => (nameError = '')}
					/>
					{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
				</Field.Field>
				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.Label for="b-phone">Telefon</Field.Label>
						<Input id="b-phone" type="tel" bind:value={customerPhone} placeholder="900 00 000" />
					</Field.Field>
					<Field.Field>
						<Field.Label for="b-email">E-post</Field.Label>
						<Input id="b-email" type="email" bind:value={customerEmail} placeholder="kari@epost.no" />
					</Field.Field>
				</div>
			</div>

			<!-- Tildeling -->
			<div class="flex flex-col gap-4 border-t border-border pt-4">
				<p class={sectionLabel}>Tildeling</p>
				<Field.Field>
					<Field.Label for="b-new-staff">Ansatt</Field.Label>
					<Select.Root
						type="single"
						value={staffId || NONE}
						onValueChange={(v) => (staffId = v === NONE ? '' : v)}
					>
						<Select.Trigger id="b-new-staff" class="w-full">{staffLabel}</Select.Trigger>
						<Select.Content>
							<Select.Item value={NONE} label="Ingen ansatt">Ingen ansatt</Select.Item>
							{#each staff as s (s.id)}
								<Select.Item value={s.id} label={s.name}>{s.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
				{#if resources.length > 0}
					<Field.Field>
						<Field.Label for="b-new-resource">Ressurs</Field.Label>
						<Select.Root
							type="single"
							value={resourceId || NONE}
							onValueChange={(v) => (resourceId = v === NONE ? '' : v)}
						>
							<Select.Trigger id="b-new-resource" class="w-full">{resourceLabel}</Select.Trigger>
							<Select.Content>
								<Select.Item value={NONE} label="Ingen ressurs">Ingen ressurs</Select.Item>
								{#each resources as r (r.id)}
									<Select.Item value={r.id} label={r.name}>{r.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}
				<Field.Field>
					<Field.Label for="b-new-notes">Notat</Field.Label>
					<Textarea
						id="b-new-notes"
						bind:value={notes}
						rows={2}
						placeholder="Intern kommentar (valgfritt)."
					/>
				</Field.Field>
			</div>
		</div>
	{/if}

	{#snippet footer()}
		{#if editing && booking}
			<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Lukk</Button>
			<Button onclick={saveDetails} disabled={saving}>
				{saving ? 'Lagrer …' : 'Lagre endringer'}
			</Button>
		{:else}
			<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
			<Button onclick={createBooking} disabled={saving}>
				{saving ? 'Oppretter …' : 'Opprett avtale'}
			</Button>
		{/if}
	{/snippet}
</Drawer>
