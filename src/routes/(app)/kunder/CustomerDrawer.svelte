<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import posthog from 'posthog-js';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import type { CustomerRow, PunchCard, Consents } from './+page';

	let {
		open = $bindable(false),
		customer = null,
		businessId,
		onsaved
	}: {
		open?: boolean;
		/** The customer being edited, or `null` to create a new one. */
		customer?: CustomerRow | null;
		businessId: string;
		/** Called after a successful create/update so the parent can invalidate. */
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(customer));

	const DEFAULT_REWARD = 'Hvert 10. besøk gir 50 % rabatt.';

	// --- form working copy ---------------------------------------------------
	let name = $state('');
	let phone = $state('');
	let email = $state('');
	let goalInput = $state<number | undefined>(10);
	let reward = $state(DEFAULT_REWARD);
	let saving = $state(false);
	let nameError = $state('');

	// Re-seed the working copy each time the drawer opens (keyed on the customer
	// id so it never fights an in-progress edit). Consents are NOT edited here —
	// granting a marketing consent is an explicit action on the customer detail
	// page; a new customer always starts with both consents OFF.
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = customer?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;

		name = customer?.name ?? '';
		phone = customer?.phone ?? '';
		email = customer?.email ?? '';
		const pc = customer?.punch_card ?? null;
		goalInput = pc && Number(pc.goal) > 0 ? Number(pc.goal) : 10;
		reward = pc?.reward_text ?? DEFAULT_REWARD;
		nameError = '';
	});

	async function save() {
		nameError = name.trim() ? '' : 'Navn må fylles ut.';
		if (nameError) return;

		const goal = Math.max(0, Math.round(Number(goalInput) || 0));
		// Preserve the existing punch count on edit; a new customer starts at 0.
		const existingCount = Math.max(0, Math.round(Number(customer?.punch_card?.count) || 0));
		const punch_card: PunchCard = {
			count: Math.min(existingCount, goal),
			goal,
			reward_text: reward.trim() || DEFAULT_REWARD
		};

		saving = true;
		try {
			if (customer) {
				// Customer update: never send `business` (API rule requires
				// @request.body.business:isset = false). Consents are left untouched.
				await pb.collection(Collections.Customers).update(customer.id, {
					name: name.trim(),
					phone: phone.trim(),
					email: email.trim(),
					punch_card
				});
				toast.success('Kunden er lagret.');
			} else {
				const consents: Consents = { email: false, sms: false };
				const created = await pb.collection(Collections.Customers).create({
					business: businessId,
					name: name.trim(),
					phone: phone.trim(),
					email: email.trim(),
					punch_card,
					consents
				});
				posthog.capture('customer_created', { customer_id: created.id });
				toast.success('Kunden er lagt til.');
			}
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
</script>

<Drawer
	bind:open
	title={editing ? 'Rediger kunde' : 'Ny kunde'}
	description="Kontaktinfo og klippekort. Samtykker styres på kundekortet."
>
	<div class="flex flex-col gap-5">
		<!-- Navn -->
		<Field.Field data-invalid={nameError ? 'true' : undefined}>
			<Field.Label for="c-name">Navn<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="c-name"
				name="c-name"
				bind:value={name}
				placeholder="F.eks. Silje Andersen"
				aria-invalid={Boolean(nameError)}
				oninput={() => (nameError = '')}
			/>
			{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
		</Field.Field>

		<!-- Telefon -->
		<Field.Field>
			<Field.Label for="c-phone">Telefon</Field.Label>
			<Input id="c-phone" name="c-phone" type="tel" bind:value={phone} placeholder="F.eks. 951 22 384" />
		</Field.Field>

		<!-- E-post -->
		<Field.Field>
			<Field.Label for="c-email">E-post</Field.Label>
			<Input
				id="c-email"
				name="c-email"
				type="email"
				bind:value={email}
				placeholder="F.eks. silje@epost.no"
			/>
		</Field.Field>

		<!-- Klippekort -->
		<div class="flex flex-col gap-4 border-t border-border pt-4">
			<p class={sectionLabel}>Klippekort</p>
			<Field.Field>
				<Field.Label for="c-goal">Antall klipp til belønning</Field.Label>
				<Input id="c-goal" name="c-goal" type="number" min="0" step="1" bind:value={goalInput} />
				<Field.Description>Sett til 0 hvis kunden ikke skal ha klippekort.</Field.Description>
			</Field.Field>
			<Field.Field>
				<Field.Label for="c-reward">Belønning</Field.Label>
				<Input id="c-reward" name="c-reward" bind:value={reward} placeholder={DEFAULT_REWARD} />
			</Field.Field>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Legg til'}
		</Button>
	{/snippet}
</Drawer>
