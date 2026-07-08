<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections, type BusinessesResponse } from '$lib/pocketbase-types';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import { initials } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Field from '$lib/components/ui/field';
	import { DAY_KEYS, type DayKey, type OpeningHours } from '../../booking/week';
	import type { SettingsBusiness } from './+page';

	let {
		business,
		onsaved
	}: {
		business: SettingsBusiness;
		/** Called after a successful save so the parent can invalidate. */
		onsaved?: () => void;
	} = $props();

	const DAY_LABELS: Record<DayKey, string> = {
		mon: 'Mandag',
		tue: 'Tirsdag',
		wed: 'Onsdag',
		thu: 'Torsdag',
		fri: 'Fredag',
		sat: 'Lørdag',
		sun: 'Søndag'
	};
	const DEFAULT_COLOR = '#2563EB';

	type DayForm = { key: DayKey; label: string; open: string; close: string; closed: boolean };

	// --- form working copy ---------------------------------------------------
	let name = $state('');
	let orgNumber = $state('');
	let phone = $state('');
	let email = $state('');
	let address = $state('');
	let primaryColor = $state(DEFAULT_COLOR);
	let days = $state<DayForm[]>([]);
	let nameError = $state('');
	let saving = $state(false);

	// Re-seed from the freshly-loaded business. Keyed on id + updated so it re-runs
	// after a save (invalidate re-fetches) but never clobbers an in-progress edit.
	let lastKey = '';
	$effect(() => {
		const key = `${business.id}:${business.updated}`;
		if (key === lastKey) return;
		lastKey = key;

		name = business.name ?? '';
		orgNumber = business.org_number ?? '';
		phone = business.phone ?? '';
		email = business.contact_email ?? '';
		address = business.address ?? '';
		primaryColor = business.primary_color || DEFAULT_COLOR;
		nameError = '';

		const oh = (business.opening_hours ?? {}) as OpeningHours;
		days = DAY_KEYS.map((k) => {
			const d = oh[k];
			return {
				key: k,
				label: DAY_LABELS[k],
				open: d?.open ?? '09:00',
				close: d?.close ?? '17:00',
				closed: !d
			};
		});
	});

	// Logo: file upload is deferred, so we render the stored logo when present and
	// an initials placeholder otherwise (seed logos are empty).
	const logoUrl = $derived(business.logo ? pb.files.getURL(business, business.logo) : '');

	function validHex(value: string): string {
		return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_COLOR;
	}

	async function save() {
		nameError = name.trim() ? '' : 'Bedriftsnavn må fylles ut.';
		if (nameError) return;

		const opening_hours: OpeningHours = {};
		for (const d of days) {
			opening_hours[d.key] = d.closed ? null : { open: d.open, close: d.close };
		}

		saving = true;
		try {
			// Owner update: only the fields the API rule allows. status/slug/modules/
			// type are agency-controlled and rejected by the customer update rule.
			const updated = await pb
				.collection(Collections.Businesses)
				.update<BusinessesResponse>(business.id, {
					name: name.trim(),
					org_number: orgNumber.trim(),
					phone: phone.trim(),
					contact_email: email.trim(),
					address: address.trim(),
					primary_color: validHex(primaryColor),
					opening_hours
				});

			// Keep the app shell (sidebar bedriftsvelger) in sync for the customer
			// whose own business this is; agency users read the active tenant from the
			// layout's business list instead, refreshed by the invalidate below.
			if (!auth.isAgency && auth.business?.id === updated.id) {
				auth.business = { ...updated };
			}

			toast.success('Endringene er lagret.');
			await invalidate('app:tenant');
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	const cardClass = 'flex flex-col gap-4 rounded-lg border border-border bg-card p-6';
	const cardTitle = 'text-base font-semibold text-foreground';
	const capsLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<div class="flex flex-col gap-6">
	<div class="grid gap-6 lg:grid-cols-[1fr_384px]">
		<!-- Om bedriften -->
		<section class={cardClass}>
			<h2 class={cardTitle}>Om bedriften</h2>

			<Field.Field data-invalid={nameError ? 'true' : undefined}>
				<Field.Label for="bp-name">Bedriftsnavn<span class="text-destructive"> *</span></Field.Label>
				<Input
					id="bp-name"
					name="bp-name"
					bind:value={name}
					placeholder="F.eks. Oslo Frisør"
					aria-invalid={Boolean(nameError)}
					oninput={() => (nameError = '')}
				/>
				{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
			</Field.Field>

			<Field.Field>
				<Field.Label for="bp-org">Organisasjonsnummer</Field.Label>
				<Input id="bp-org" name="bp-org" bind:value={orgNumber} placeholder="F.eks. 912 345 678" />
			</Field.Field>

			<Field.Field>
				<Field.Label for="bp-phone">Telefon</Field.Label>
				<Input id="bp-phone" name="bp-phone" type="tel" bind:value={phone} placeholder="F.eks. 22 11 22 33" />
			</Field.Field>

			<Field.Field>
				<Field.Label for="bp-email">E-post</Field.Label>
				<Input
					id="bp-email"
					name="bp-email"
					type="email"
					bind:value={email}
					placeholder="F.eks. post@bedriften.no"
				/>
			</Field.Field>

			<Field.Field>
				<Field.Label for="bp-address">Adresse</Field.Label>
				<Input
					id="bp-address"
					name="bp-address"
					bind:value={address}
					placeholder="F.eks. Storgata 12, 0155 Oslo"
				/>
			</Field.Field>
		</section>

		<!-- Høyre kolonne -->
		<div class="flex flex-col gap-6">
			<!-- Logo og farger -->
			<section class={cardClass}>
				<h2 class={cardTitle}>Logo og farger</h2>

				<p class={capsLabel}>Logo</p>
				<div class="flex items-center gap-4">
					<div
						class="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-sm font-semibold text-muted-foreground"
					>
						{#if logoUrl}
							<img src={logoUrl} alt="Logo for {name}" class="size-full object-cover" />
						{:else}
							{initials(name || business.name)}
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<Button variant="outline" size="sm" disabled>Last opp ny</Button>
						<p class="text-xs text-muted-foreground">Bildeopplasting kommer snart.</p>
					</div>
				</div>

				<div class="h-px w-full bg-border"></div>

				<p class={capsLabel}>Profilfarge</p>
				<div class="flex items-center gap-3">
					<div
						class="relative size-8 shrink-0 rounded-lg border border-border"
						style="background-color: {validHex(primaryColor)};"
					>
						<input
							type="color"
							aria-label="Velg profilfarge"
							value={validHex(primaryColor)}
							oninput={(e) => (primaryColor = e.currentTarget.value)}
							class="absolute inset-0 size-full cursor-pointer opacity-0"
						/>
					</div>
					<Input
						name="bp-color"
						bind:value={primaryColor}
						aria-label="Profilfarge (hex)"
						class="w-[120px] font-mono uppercase"
						placeholder="#2563EB"
					/>
				</div>
				<p class="text-xs text-muted-foreground">
					Brukes på nettsiden, lenkesiden og i e-poster.
				</p>
			</section>

			<!-- Åpningstider -->
			<section class={cardClass}>
				<h2 class={cardTitle}>Åpningstider</h2>
				<p class="text-sm text-muted-foreground">
					Vises automatisk på nettsiden og lenkesiden din.
				</p>
				<div class="flex flex-col gap-3">
					{#each days as day (day.key)}
						<div class="flex items-center gap-3">
							<span class="w-20 shrink-0 text-sm font-medium text-foreground">{day.label}</span>
							{#if day.closed}
								<span class="flex-1 text-sm text-muted-foreground">Stengt</span>
							{:else}
								<div class="flex flex-1 items-center gap-2">
									<Input
										type="time"
										aria-label="{day.label} åpner"
										bind:value={day.open}
										class="w-[104px]"
									/>
									<span class="text-muted-foreground">–</span>
									<Input
										type="time"
										aria-label="{day.label} stenger"
										bind:value={day.close}
										class="w-[104px]"
									/>
								</div>
							{/if}
							<Switch
								checked={!day.closed}
								onCheckedChange={(v) => (day.closed = !v)}
								aria-label="Åpent {day.label.toLowerCase()}"
							/>
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>

	<!-- Lagre-linje: den ENESTE svarte primærknappen på skjermen -->
	<div class="flex justify-end border-t border-border pt-6">
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	</div>
</div>
