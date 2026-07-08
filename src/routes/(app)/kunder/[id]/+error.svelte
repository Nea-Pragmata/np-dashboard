<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { Button } from '$lib/components/ui/button';

	const notFound = $derived(page.status === 404);

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

<svelte:head><title>Kunder · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<header class="flex items-center gap-4">
		<a
			href="/kunder"
			aria-label="Tilbake til kundelisten"
			class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-text-body outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
		>
			<ChevronLeft class="size-4" />
		</a>
		<h1 class="text-2xl font-semibold text-foreground">Kunder</h1>
	</header>

	<div
		class="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-card"
	>
		<div class="flex flex-col items-center gap-2 px-6 py-16 text-center">
			<span class="flex size-12 items-center justify-center rounded-full bg-error-bg text-error">
				<CircleAlert class="size-[22px]" />
			</span>
			<p class="mt-1 text-base font-semibold text-foreground">
				{notFound ? 'Fant ikke kunden' : 'Noe gikk galt'}
			</p>
			<p class="max-w-[340px] text-sm text-muted-foreground">
				{#if notFound}
					Kunden finnes ikke, eller du har ikke tilgang til den.
				{:else}
					{page.error?.message
						? `${page.error.message}. Sjekk tilkoblingen og prøv igjen.`
						: 'Vi fikk ikke lastet kundekortet. Sjekk tilkoblingen og prøv igjen.'}
				{/if}
			</p>
			{#if notFound}
				<Button variant="outline" class="mt-2" href="/kunder">Til kundelisten</Button>
			{:else}
				<Button variant="outline" class="mt-2" onclick={retry} disabled={retrying}>
					{retrying ? 'Prøver …' : 'Prøv igjen'}
				</Button>
			{/if}
		</div>
	</div>
</div>
