<script lang="ts">
	import { consent } from '$lib/stores/consent.svelte';
	import { Button } from '$lib/components/ui/button';

	// ponytail: placeholder copy — the controller name, retention period and DPO
	// contact must be confirmed and signed off by NP's personvernansvarlig/jurist
	// before this goes live. The legal structure (two tiers) is correct; the
	// specific values below are drafts.
	const RETENTION = '12 måneder';
</script>

<svelte:head><title>Personvernerklæring · NP Dashboard</title></svelte:head>

<main class="mx-auto max-w-2xl space-y-8 px-4 py-10 text-card-foreground">
	<header class="space-y-2">
		<a href="/" class="text-sm text-muted-foreground underline underline-offset-4">← Tilbake</a>
		<h1 class="text-2xl font-semibold">Personvern og analyse</h1>
		<p class="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
			Utkast. Innholdet under beskriver hvordan analysen er bygget, men må gjennomgås og
			godkjennes av personvernansvarlig før det regnes som endelig.
		</p>
	</header>

	<section class="space-y-2">
		<h2 class="text-lg font-medium">Kort fortalt</h2>
		<p class="text-sm text-muted-foreground">
			Vi bruker PostHog til å måle hvordan tjenesten brukes, slik at vi kan drifte og forbedre
			den. Analysen har to nivåer, og du bestemmer selv nivået.
		</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-medium">Uten samtykke (grunnlinje)</h2>
		<p class="text-sm text-muted-foreground">
			Så lenge du ikke har samtykket, kjører analysen «cookieless»: vi lagrer ingenting på
			enheten din (verken informasjonskapsler eller data i nettleseren) og bruker ikke navn
			eller e-post. Vi registrerer bare enkle hendelser (for eksempel innlogging og at en
			avtale, kunde eller kampanje ble opprettet) for å forstå bruk og driftsstabilitet.
			Behandlingsgrunnlaget er berettiget interesse (personvernforordningen artikkel 6 nr. 1
			bokstav f). Fordi tjenesten krever innlogging, regnes disse dataene som pseudonyme
			personopplysninger — ikke helt anonyme — og du kan når som helst protestere mot
			behandlingen (artikkel 21).
		</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-medium">Med samtykke (utvidet)</h2>
		<p class="text-sm text-muted-foreground">
			Godtar du, lagrer vi litt analysedata i nettleseren din (localStorage) og knytter bruken
			til kontoen din, inkludert e-post og navn, slik at vi ser sammenhengende bruk på tvers av
			økter. Dette gir bedre innsikt, men krever ditt aktive samtykke fordi vi da lagrer data på
			enheten din (ekomloven § 3-15). Du kan trekke tilbake samtykket når som helst — da går vi
			tilbake til grunnlinjen og sletter analysedataene som ble lagret i nettleseren.
		</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-medium">Databehandler og lagring</h2>
		<p class="text-sm text-muted-foreground">
			Analysen behandles av PostHog i EU (eu.i.posthog.com). Analysedata lagres i inntil {RETENTION}.
			Vi selger ikke data videre og bruker den ikke til annonsering.
		</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-medium">Dine rettigheter</h2>
		<p class="text-sm text-muted-foreground">
			Du har rett til innsyn, retting, sletting og til å protestere mot behandling basert på
			berettiget interesse. Ta kontakt med oss for å bruke rettighetene dine.
		</p>
	</section>

	<section class="space-y-3 rounded-xl border border-border bg-card p-5">
		<h2 class="text-lg font-medium">Endre samtykke</h2>
		{#if consent.status === 'granted'}
			<p class="text-sm text-muted-foreground">
				Du har godtatt utvidet analyse. Du kan trekke det tilbake når som helst.
			</p>
			<Button variant="outline" onclick={() => consent.decline()}>Trekk tilbake samtykke</Button>
		{:else if consent.status === 'denied'}
			<p class="text-sm text-muted-foreground">
				Du bruker grunnlinjen uten samtykke. Du kan når som helst godta utvidet analyse.
			</p>
			<Button variant="outline" onclick={() => consent.accept()}>Godta utvidet analyse</Button>
		{:else if consent.status === 'pending'}
			<p class="text-sm text-muted-foreground">Du har ikke gjort et valg ennå.</p>
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => consent.decline()}>Fortsett uten</Button>
				<Button variant="outline" onclick={() => consent.accept()}>Godta</Button>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Analyse er ikke aktivert i denne installasjonen.</p>
		{/if}
	</section>
</main>
