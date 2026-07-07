<script lang="ts">
	import { page } from '$app/state';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { Button } from '$lib/components/ui/button';

	// Root error boundary: catches failures in the root layout load (e.g. the
	// auth bootstrap) where the app shell has not rendered. Standalone full page.
	let retrying = $state(false);
	function retry() {
		retrying = true;
		// A root-load failure can't be recovered with invalidateAll (the failing
		// load re-runs on a full reload), so reload the page.
		location.reload();
	}
</script>

<svelte:head><title>Noe gikk galt · NP Dashboard</title></svelte:head>

<div class="flex min-h-svh items-center justify-center bg-background p-6">
	<div
		class="flex w-full max-w-md flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-12 text-center"
	>
		<span class="flex size-12 items-center justify-center rounded-full bg-error-bg text-error">
			<CircleAlert class="size-[22px]" />
		</span>
		<p class="mt-1 text-base font-semibold text-foreground">Noe gikk galt</p>
		<p class="max-w-[340px] text-sm text-muted-foreground">
			{page.status === 404
				? 'Fant ikke siden du lette etter.'
				: 'Vi fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.'}
		</p>
		<Button variant="outline" class="mt-2" onclick={retry} disabled={retrying}>
			{retrying ? 'Laster …' : 'Prøv igjen'}
		</Button>
	</div>
</div>
