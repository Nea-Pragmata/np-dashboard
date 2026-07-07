<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
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

<svelte:head><title>Innstillinger · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<header>
		<h1 class="text-2xl font-semibold text-foreground">Innstillinger</h1>
		<p class="mt-1 text-sm text-muted-foreground">Bedriftsprofil, tilganger og oppsett.</p>
	</header>

	<div
		class="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-card"
	>
		<div class="flex flex-col items-center gap-2 px-6 py-16 text-center">
			<span class="flex size-12 items-center justify-center rounded-full bg-error-bg text-error">
				<CircleAlert class="size-[22px]" />
			</span>
			<p class="mt-1 text-base font-semibold text-foreground">Noe gikk galt</p>
			<p class="max-w-[340px] text-sm text-muted-foreground">
				{page.error?.message
					? `${page.error.message}. Sjekk tilkoblingen og prøv igjen.`
					: 'Vi fikk ikke lastet innstillingene. Sjekk tilkoblingen og prøv igjen.'}
			</p>
			<Button variant="outline" class="mt-2" onclick={retry} disabled={retrying}>
				{retrying ? 'Prøver …' : 'Prøv igjen'}
			</Button>
		</div>
	</div>
</div>
