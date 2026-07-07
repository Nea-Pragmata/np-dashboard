<script lang="ts">
	import { navigating } from '$app/state';
	import { invalidate } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button';
	import { auth } from '$lib/stores/auth.svelte';
	import { FANES } from '../fanes';
	import BedriftsprofilTab from './BedriftsprofilTab.svelte';
	import DomeneEpostTab from './DomeneEpostTab.svelte';
	import TeamTab from './TeamTab.svelte';
	import IntegrasjonerTab from './IntegrasjonerTab.svelte';
	import AbonnementTab from './AbonnementTab.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const fane = $derived(data.fane);
	// Only the owner may invite/manage other users (enforced by the API rules).
	const isOwner = $derived(auth.user?.role === 'owner');

	// Shared open-state for the invite drawer: the "Inviter bruker" primary lives
	// in the page header (per Figma 249:4656) but the drawer belongs to TeamTab.
	let inviteOpen = $state(false);

	function refresh() {
		return invalidate('app:settings');
	}

	// Loading skeleton fires while a navigation into a settings tab is in flight
	// (tab switch or client entry); an already-mounted tab never shows it.
	const loading = $derived(
		Boolean(navigating.to?.route.id?.startsWith('/(app)/innstillinger'))
	);
</script>

<svelte:head><title>Innstillinger · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Sidetopp: tittel + (kun Team) svart primær «Inviter bruker» -->
	<header class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Innstillinger</h1>
			<p class="mt-1 text-sm text-muted-foreground">Bedriftsprofil, tilganger og oppsett.</p>
		</div>
		{#if fane === 'team' && isOwner}
			<Button onclick={() => (inviteOpen = true)}>
				<Plus class="size-4" />
				Inviter bruker
			</Button>
		{/if}
	</header>

	<!-- Fanelinje -->
	<nav class="flex gap-6 overflow-x-auto border-b border-border" aria-label="Innstillinger">
		{#each FANES as f (f.slug)}
			{@const active = f.slug === fane}
			<a
				href="/innstillinger/{f.slug}"
				aria-current={active ? 'page' : undefined}
				class={[
					'relative -mb-px shrink-0 border-b-2 px-1 pb-3 pt-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
					active
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				]}
			>
				{f.label}
			</a>
		{/each}
	</nav>

	<!-- Aktiv fane -->
	{#if loading}
		<div class="h-64 animate-pulse rounded-xl border border-border bg-card"></div>
	{:else if fane === 'bedriftsprofil'}
		<BedriftsprofilTab business={data.business} onsaved={refresh} />
	{:else if fane === 'domene-epost'}
		<DomeneEpostTab business={data.business} />
	{:else if fane === 'team'}
		<TeamTab users={data.users} businessId={data.business.id} {isOwner} bind:inviteOpen onsaved={refresh} />
	{:else if fane === 'integrasjoner'}
		<IntegrasjonerTab integrations={data.integrations} />
	{:else if fane === 'abonnement'}
		<AbonnementTab subscription={data.subscription} modules={data.modules} />
	{/if}
</div>
