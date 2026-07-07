<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	// Stub so the agency-only «NP Admin» nav entry resolves. The real superadmin
	// surface (dark sidebar, tenant overview, pakker, tilganger, AI-jobber) is
	// milestone 13.
</script>

<svelte:head><title>NP Admin</title></svelte:head>

<div class="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
	<h1 class="text-2xl font-semibold text-foreground">NP Admin</h1>
	<p class="text-sm text-muted-foreground">
		Byråets administrasjonsområde bygges i en senere milepæl.
	</p>
	<a
		href="/oversikt"
		class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	>
		<ArrowLeft class="size-4" />
		Til dashbordet
	</a>
</div>
