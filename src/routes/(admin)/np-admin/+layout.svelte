<script lang="ts">
	import type { Snippet } from 'svelte';
	import AdminShell from '$lib/components/layout/AdminShell.svelte';

	// The whole NP Admin area lives inside the dark superadmin shell. Access is
	// already gated by (admin)/+layout.ts (non-agency users are redirected out).
	let { children }: { children: Snippet } = $props();
</script>

<AdminShell>
	{@render children()}
</AdminShell>
