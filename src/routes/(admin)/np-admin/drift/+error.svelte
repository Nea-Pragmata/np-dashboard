<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '$lib/components/ui/button';

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

<svelte:head><title>Drift &amp; status · NP Admin</title></svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<div
		class="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center"
	>
		<span class="flex size-12 items-center justify-center rounded-full bg-error-bg text-error">
			<TriangleAlert class="size-6" />
		</span>
		<div class="flex flex-col gap-1">
			<h2 class="text-lg font-semibold text-foreground">Kunne ikke laste driftsstatus</h2>
			<p class="text-sm text-muted-foreground">
				{page.error?.message ?? 'Noe gikk galt. Prøv igjen.'}
			</p>
		</div>
		<Button variant="outline" size="lg" onclick={retry} disabled={retrying}>
			{retrying ? 'Prøver …' : 'Prøv igjen'}
		</Button>
	</div>
</div>
