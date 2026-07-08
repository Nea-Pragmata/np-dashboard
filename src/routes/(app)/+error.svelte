<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { Button } from '$lib/components/ui/button';

	// App-level error boundary: catches layout-load failures and any route that
	// has no leaf +error.svelte of its own. Renders inside the app shell.
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

<svelte:head><title>Noe gikk galt · NP Dashboard</title></svelte:head>

<div class="flex h-full items-center justify-center p-4 sm:p-6 lg:p-8">
	<div
		class="flex w-full max-w-md flex-col items-center gap-2 rounded-lg border border-border bg-card px-6 py-12 text-center"
	>
		<span class="flex size-12 items-center justify-center rounded-full bg-error-bg text-error">
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
