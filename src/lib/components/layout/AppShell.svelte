<script lang="ts">
	import type { Snippet } from 'svelte';

	// Custom app frame (NOT the shadcn sidebar block). Responsive:
	//  - Desktop (≥768px / md): 248px sidebar + 56px topbar + scrollable content —
	//    unchanged from prior milestones.
	//  - Mobile (<768px): sidebar hidden; a mobile header sits on top, the content
	//    scrolls, and a bottom tab bar is pinned in-flow at the foot of the column
	//    (so it never overlaps content — no bottom padding needed). The mobile menu
	//    sheet + FAB are portaled/fixed and owned by the layout.
	let {
		sidebar,
		topbar,
		mobileHeader,
		tabbar,
		children
	}: {
		sidebar: Snippet;
		topbar: Snippet;
		mobileHeader: Snippet;
		tabbar: Snippet;
		children: Snippet;
	} = $props();
</script>

<div class="flex h-svh w-full overflow-hidden bg-background">
	<aside
		class="hidden h-full w-[248px] shrink-0 flex-col border-r border-border bg-sidebar md:flex"
	>
		{@render sidebar()}
	</aside>
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="hidden md:block">{@render topbar()}</div>
		<div class="md:hidden">{@render mobileHeader()}</div>
		<main class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
			{@render children()}
		</main>
		<div class="md:hidden">{@render tabbar()}</div>
	</div>
</div>
