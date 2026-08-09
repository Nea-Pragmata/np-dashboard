<script lang="ts">
	import { untrack } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import Users from '@lucide/svelte/icons/users';
	import { toast } from 'svelte-sonner';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { formatNumber } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import posthog from 'posthog-js';
	import { pb } from '$lib/pb';
	import {
		Collections,
		CampaignsChannelOptions,
		CampaignsStatusOptions
	} from '$lib/pocketbase-types';
	import { cn } from '$lib/utils.js';
	import type { CampaignRow, RecipientCounts } from '../marketing';

	let {
		campaign = null,
		recipients,
		businessId,
		businessName,
		onclose,
		onsaved
	}: {
		/** The campaign being edited, or `null` for a new one. */
		campaign?: CampaignRow | null;
		recipients: RecipientCounts;
		businessId: string;
		businessName: string;
		/** Close the flow without saving. */
		onclose: () => void;
		/** Called after a successful save so the parent can invalidate + close. */
		onsaved: () => void;
	} = $props();

	const editing = $derived(Boolean(campaign));

	// The wizard is re-keyed on the target campaign by the parent, so a one-time
	// snapshot is exactly what we want (untrack silences the initial-value warning).
	const init = untrack(() => campaign);
	let step = $state(1);
	let name = $state(init?.name ?? '');
	let channel = $state<CampaignsChannelOptions>(init?.channel ?? CampaignsChannelOptions.email);
	let subject = $state(init?.subject ?? '');
	let message = $state(init?.message ?? '');
	let sendMode = $state<'now' | 'schedule'>('now');
	let scheduleDate = $state('');
	let scheduleTime = $state('09:00');
	let saving = $state(false);

	let nameError = $state('');
	let subjectError = $state('');
	let messageError = $state('');
	let scheduleError = $state('');

	const STEPS = [
		{ n: 1, label: 'Mottakere' },
		{ n: 2, label: 'Innhold' },
		{ n: 3, label: 'Send' }
	] as const;
	const STEP_HINT: Record<number, string> = {
		1: 'velg mottakere.',
		2: 'skriv innholdet.',
		3: 'send eller planlegg.'
	};

	const isEmail = $derived(channel === CampaignsChannelOptions.email);
	const recipientCount = $derived(isEmail ? recipients.email : recipients.sms);
	const consentLabel = $derived(isEmail ? 'e-post' : 'SMS');

	function validateStep1(): boolean {
		nameError = name.trim() ? '' : 'Gi kampanjen et navn.';
		return !nameError;
	}
	function validateStep2(): boolean {
		messageError = message.trim() ? '' : 'Skriv en melding.';
		subjectError = isEmail && !subject.trim() ? 'Skriv et emne.' : '';
		return !messageError && !subjectError;
	}

	function next() {
		if (step === 1) {
			if (!validateStep1()) return;
			step = 2;
		} else if (step === 2) {
			if (!validateStep2()) return;
			step = 3;
		}
	}
	function prev() {
		if (step > 1) step -= 1;
	}

	/** Scheduled instant as a UTC-literal ISO string (matches the app's clock convention). */
	function scheduledIso(): string | null {
		if (sendMode === 'now') return new Date().toISOString();
		if (!scheduleDate || !scheduleTime) return null;
		return `${scheduleDate}T${scheduleTime}:00.000Z`;
	}

	async function persist(status: CampaignsStatusOptions, scheduledAt?: string) {
		saving = true;
		const payload: Record<string, unknown> = {
			name: name.trim(),
			channel,
			subject: isEmail ? subject.trim() : '',
			message,
			audience: { count: recipientCount, consent: channel },
			status
		};
		if (status === CampaignsStatusOptions.scheduled) payload.scheduled_at = scheduledAt ?? '';

		try {
			if (campaign) {
				// Customer update rule requires business:isset = false — never resend it.
				await pb.collection(Collections.Campaigns).update(campaign.id, payload);
			} else {
				const created = await pb.collection(Collections.Campaigns).create({ ...payload, business: businessId });
				posthog.capture('campaign_created', { campaign_id: created.id });
			}
			return true;
		} catch (e) {
			toast.error(pbError(e));
			return false;
		} finally {
			saving = false;
		}
	}

	async function saveDraft() {
		// A draft needs at least a name; bounce back to step 1 if it's missing.
		if (!validateStep1()) {
			step = 1;
			return;
		}
		if (await persist(CampaignsStatusOptions.draft)) {
			toast.success('Utkastet er lagret.');
			onsaved();
		}
	}

	async function finish() {
		if (!validateStep1()) {
			step = 1;
			return;
		}
		if (!validateStep2()) {
			step = 2;
			return;
		}
		const iso = scheduledIso();
		if (sendMode === 'schedule' && !iso) {
			scheduleError = 'Velg dato og klokkeslett.';
			return;
		}
		scheduleError = '';
		// Sending is a deferred server hook — we only ever record the intent
		// (status = scheduled + when). No fake delivery, no invented results.
		if (await persist(CampaignsStatusOptions.scheduled, iso ?? undefined)) {
			toast.success(sendMode === 'now' ? 'Kampanjen er lagt i sendekø.' : 'Kampanjen er planlagt.');
			onsaved();
		}
	}

	const segClass = (active: boolean) =>
		cn(
			'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
			active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
		);
	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<div class="flex flex-col gap-6">
	<!-- Wizard header (own title + actions; page keeps the «Markedsføring» H1) -->
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h2 class="text-xl font-semibold text-foreground">
				{editing ? 'Rediger kampanje' : 'Ny kampanje'}
			</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Steg {step} av 3 — {STEP_HINT[step]}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="ghost" onclick={onclose} disabled={saving}>Avbryt</Button>
			<Button variant="outline" onclick={saveDraft} disabled={saving}>Lagre utkast</Button>
		</div>
	</div>

	<!-- Steg-indikator -->
	<ol class="flex items-center gap-2" aria-label="Fremdrift">
		{#each STEPS as s, i (s.n)}
			{@const done = step > s.n}
			{@const current = step === s.n}
			<li class="flex items-center gap-2">
				<span
					class={cn(
						'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
						done && 'bg-foreground text-background',
						current && 'bg-foreground text-background',
						!done && !current && 'border border-border text-muted-foreground'
					)}
					aria-current={current ? 'step' : undefined}
				>
					{#if done}<Check class="size-3.5" />{:else}{s.n}{/if}
				</span>
				<span class={cn('text-sm', current ? 'font-medium text-foreground' : 'text-muted-foreground')}>
					{s.label}
				</span>
			</li>
			{#if i < STEPS.length - 1}
				<li aria-hidden="true" class="h-px w-8 bg-border sm:w-12"></li>
			{/if}
		{/each}
	</ol>

	<!-- Steg 1: Mottakere -->
	{#if step === 1}
		<div class="max-w-xl rounded-lg border border-border bg-card p-6">
			<div class="flex flex-col gap-5">
				<Field.Field data-invalid={nameError ? 'true' : undefined}>
					<Field.Label for="c-name">Kampanjenavn<span class="text-destructive"> *</span></Field.Label>
					<Input
						id="c-name"
						name="kampanjenavn"
						bind:value={name}
						placeholder="F.eks. Sommertilbud juli"
						aria-invalid={Boolean(nameError)}
						oninput={() => (nameError = '')}
					/>
					<Field.Description>Bare til internt bruk — kundene ser ikke navnet.</Field.Description>
					{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
				</Field.Field>

				<Field.Field>
					<Field.Label>Kanal</Field.Label>
					<div class="flex gap-1 rounded-lg bg-muted p-1">
						<button type="button" class={segClass(isEmail)} onclick={() => (channel = CampaignsChannelOptions.email)}>
							E-post
						</button>
						<button type="button" class={segClass(!isEmail)} onclick={() => (channel = CampaignsChannelOptions.sms)}>
							SMS
						</button>
					</div>
				</Field.Field>

				<div class="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
					<Users class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
					<p class="text-sm text-text-body">
						<span class="font-medium text-foreground">{formatNumber(recipientCount)} mottakere</span>
						· alle kunder med samtykke til {consentLabel}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Steg 2: Innhold -->
	{#if step === 2}
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Innhold -->
			<div class="rounded-lg border border-border bg-card p-6">
				<h3 class="mb-4 text-base font-semibold text-foreground">Innhold</h3>
				<div class="flex flex-col gap-5">
					<div class="flex flex-col gap-2">
						<p class={sectionLabel}>Kanal</p>
						<div class="flex gap-1 rounded-lg bg-muted p-1">
							<button type="button" class={segClass(isEmail)} onclick={() => (channel = CampaignsChannelOptions.email)}>
								E-post
							</button>
							<button type="button" class={segClass(!isEmail)} onclick={() => (channel = CampaignsChannelOptions.sms)}>
								SMS
							</button>
						</div>
					</div>

					{#if isEmail}
						<Field.Field data-invalid={subjectError ? 'true' : undefined}>
							<Field.Label for="c-subject">Emne<span class="text-destructive"> *</span></Field.Label>
							<Input
								id="c-subject"
								name="emne"
								bind:value={subject}
								placeholder="Sommertilbud: −20 % på farging i juli"
								aria-invalid={Boolean(subjectError)}
								oninput={() => (subjectError = '')}
							/>
							{#if subjectError}<Field.Error>{subjectError}</Field.Error>{/if}
						</Field.Field>
					{/if}

					<Field.Field data-invalid={messageError ? 'true' : undefined}>
						<Field.Label for="c-message">Melding<span class="text-destructive"> *</span></Field.Label>
						<Textarea
							id="c-message"
							name="melding"
							bind:value={message}
							rows={6}
							placeholder="Hei {'{fornavn}'}! …"
							aria-invalid={Boolean(messageError)}
							oninput={() => (messageError = '')}
						/>
						<Field.Description>Flettefelt: {'{fornavn}'} settes inn automatisk.</Field.Description>
						{#if messageError}<Field.Error>{messageError}</Field.Error>{/if}
					</Field.Field>
				</div>
			</div>

			<!-- Forhåndsvisning -->
			<div class="rounded-lg border border-border bg-card p-6">
				<h3 class="mb-4 text-base font-semibold text-foreground">Forhåndsvisning</h3>
				<div class="rounded-lg bg-muted/50 p-5">
					<div class="rounded-md border border-border bg-card p-5">
						<p class="text-xs text-muted-foreground">Fra: {businessName}</p>
						{#if isEmail && subject.trim()}
							<p class="mt-2 text-sm font-semibold text-foreground">{subject}</p>
							<hr class="my-3 border-border" />
						{/if}
						<p class="whitespace-pre-wrap text-sm text-text-body">
							{message.trim() || 'Meldingen vises her mens du skriver.'}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Mottaker-oppsummering med lenke tilbake til steg 1 -->
		<div class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-5 py-4">
			<Users class="size-4 shrink-0 text-text-subtle" aria-hidden="true" />
			<p class="text-sm text-text-body">
				<span class="font-medium text-foreground">{formatNumber(recipientCount)} mottakere</span>
				· Samtykke: {consentLabel}
			</p>
			<button
				type="button"
				class="ml-auto text-sm font-medium text-accent-blue-text underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
				onclick={() => (step = 1)}
			>
				Endre utvalg
			</button>
		</div>
	{/if}

	<!-- Steg 3: Send -->
	{#if step === 3}
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Oppsummering -->
			<div class="rounded-lg border border-border bg-card p-6">
				<h3 class="mb-4 text-base font-semibold text-foreground">Oppsummering</h3>
				<dl class="flex flex-col gap-3 text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-muted-foreground">Kanal</dt>
						<dd class="font-medium text-foreground">{isEmail ? 'E-post' : 'SMS'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-muted-foreground">Mottakere</dt>
						<dd class="font-medium tabular-nums text-foreground">{formatNumber(recipientCount)}</dd>
					</div>
					{#if isEmail}
						<div class="flex justify-between gap-4">
							<dt class="shrink-0 text-muted-foreground">Emne</dt>
							<dd class="truncate text-right font-medium text-foreground">{subject || '—'}</dd>
						</div>
					{/if}
				</dl>
			</div>

			<!-- Send-valg -->
			<div class="rounded-lg border border-border bg-card p-6">
				<h3 class="mb-4 text-base font-semibold text-foreground">Når skal den sendes?</h3>
				<div class="flex flex-col gap-3">
					<label
						class={cn(
							'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
							sendMode === 'now' ? 'border-foreground bg-muted/40' : 'border-border hover:bg-muted/40'
						)}
					>
						<input type="radio" name="send-mode" value="now" bind:group={sendMode} class="mt-1" />
						<span class="flex flex-col">
							<span class="text-sm font-medium text-foreground">Send nå</span>
							<span class="text-xs text-muted-foreground">Legges i sendekø med en gang.</span>
						</span>
					</label>
					<label
						class={cn(
							'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
							sendMode === 'schedule' ? 'border-foreground bg-muted/40' : 'border-border hover:bg-muted/40'
						)}
					>
						<input type="radio" name="send-mode" value="schedule" bind:group={sendMode} class="mt-1" />
						<span class="flex flex-1 flex-col gap-2">
							<span class="text-sm font-medium text-foreground">Planlegg</span>
							{#if sendMode === 'schedule'}
								<span class="flex flex-wrap gap-2">
									<Input
										type="date"
										name="planlagt-dato"
										aria-label="Dato"
										bind:value={scheduleDate}
										class="w-auto"
										oninput={() => (scheduleError = '')}
									/>
									<Input
										type="time"
										name="planlagt-tid"
										aria-label="Klokkeslett"
										bind:value={scheduleTime}
										class="w-auto"
										oninput={() => (scheduleError = '')}
									/>
								</span>
								{#if scheduleError}
									<span class="text-xs text-destructive">{scheduleError}</span>
								{/if}
							{/if}
						</span>
					</label>
					<p class="text-xs text-muted-foreground">
						Selve utsendingen kjøres av NP. Du kan følge med på resultatene her etterpå.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Bunn-navigasjon -->
	<div class="flex items-center justify-between gap-3">
		{#if step > 1}
			<Button variant="outline" onclick={prev} disabled={saving}>Forrige</Button>
		{:else}
			<span></span>
		{/if}
		{#if step < 3}
			<Button onclick={next} disabled={saving}>
				{step === 1 ? 'Neste: Innhold' : 'Neste: Send'}
			</Button>
		{:else}
			<Button onclick={finish} disabled={saving}>
				{saving ? 'Lagrer …' : sendMode === 'now' ? 'Send nå' : 'Planlegg'}
			</Button>
		{/if}
	</div>
</div>
