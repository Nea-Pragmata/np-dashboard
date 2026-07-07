<script lang="ts">
	import type { Snippet } from 'svelte';

	// Custom app frame (NOT the shadcn sidebar block): a fixed 248px sidebar, a
	// self-contained 56px topbar, and a scrollable content region. The `sidebar`
	// and `topbar` snippets render their own chrome/borders; this component only
	// owns the outer geometry.
	let {
		sidebar,
		topbar,
		children
	}: {
		sidebar: Snippet;
		topbar: Snippet;
		children: Snippet;
	} = $props();
</script>

<div class="flex h-svh w-full overflow-hidden bg-background">
	<aside
		class="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-sidebar"
	>
		{@render sidebar()}
	</aside>
	<div class="flex min-w-0 flex-1 flex-col">
		{@render topbar()}
		<main class="min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
