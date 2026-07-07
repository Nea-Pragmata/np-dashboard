<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';

	// Placeholder — the real Oversikt (KPI-cards, activity) arrives in milestone 3.
	const firstName = $derived((auth.user?.name ?? '').split(/\s+/)[0]);
</script>

<svelte:head><title>Oversikt · NP Dashboard</title></svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-16 text-center">
	<h2 class="text-2xl font-semibold text-foreground">
		God morgen{firstName ? `, ${firstName}` : ''}
	</h2>
	<p class="text-sm text-muted-foreground">
		Her kommer oversikten din. Innholdet bygges i neste milepæl.
	</p>
</div>
