<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';

	// Static tab labels — the counts are unknown while the load has failed, so we
	// don't fabricate them (matches the designed «Feiltilstand» frame layout).
	const TABS = ['Alle', 'Nye', 'Under arbeid', 'Fullført'];

	let retrying = $state(false);
	async function retry() {
		retrying = true;
		try {
			await invalidateAll();
		} finally {
			retrying = false;
		}
	}
</script>

<svelte:head><title>Henvendelser · NP Dashboard</title></svelte:head>

<div class="flex h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="shrink-0">
		<h1 class="text-2xl font-semibold text-foreground">Henvendelser</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Alt kundene sender inn — skjema, chat og tilbudsforespørsler.
		</p>
	</header>

	<!-- Faner (statiske i feiltilstand) -->
	<div class="flex shrink-0 gap-6 overflow-x-auto border-b border-border">
		{#each TABS as t, i (t)}
			<span
				class={cn(
					'relative -mb-px whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-medium',
					i === 0 ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'
				)}
			>
				{t}
			</span>
		{/each}
	</div>

	<!-- Hovedrad: feilkort + tomt detaljkort -->
	<div class="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
		<div
			class="flex min-h-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card lg:w-[400px] lg:shrink-0"
		>
			<div class="flex flex-col items-center gap-2 px-6 py-12 text-center">
				<span
					class="flex size-12 items-center justify-center rounded-full bg-error-bg text-error"
				>
					<CircleAlert class="size-[22px]" />
				</span>
				<p class="mt-1 text-base font-semibold text-foreground">Noe gikk galt</p>
				<p class="max-w-[340px] text-sm text-muted-foreground">
					{page.error?.message
						? `${page.error.message}. Sjekk tilkoblingen og prøv igjen.`
						: 'Vi fikk ikke lastet innholdet. Sjekk tilkoblingen og prøv igjen.'}
				</p>
				<Button variant="outline" class="mt-2" onclick={retry} disabled={retrying}>
					{retrying ? 'Prøver …' : 'Prøv igjen'}
				</Button>
			</div>
		</div>
		<div
			class="hidden min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-6 lg:flex"
		>
			<p class="text-sm text-text-subtle">Velg en henvendelse i listen</p>
		</div>
	</div>
</div>
