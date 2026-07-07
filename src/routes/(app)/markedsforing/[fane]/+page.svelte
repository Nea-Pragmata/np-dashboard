<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import { auth } from '$lib/stores/auth.svelte';
	import { availableTabs, type CampaignRow } from '../marketing';
	import KampanjerTab from './KampanjerTab.svelte';
	import CampaignWizard from './CampaignWizard.svelte';
	import LenkerTab from './LenkerTab.svelte';
	import SosialeTab from './SosialeTab.svelte';
	import AnnonserTab from './AnnonserTab.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const businessId = $derived(data.business?.id ?? '');
	const businessName = $derived(data.business?.name ?? '');
	const tabs = $derived(availableTabs(data.modules));
	// Only the agency produces/edits/publishes social posts; the customer approves.
	const canManage = $derived(auth.isAgency);

	// --- campaign wizard (owned here so the header can hide its own primary) ---
	let wizardMode = $state<'closed' | 'new' | 'edit'>('closed');
	let editingCampaign = $state<CampaignRow | null>(null);

	// Reset the wizard whenever the active fane actually changes (the component is
	// reused across param navigations).
	let lastFane = untrack(() => data.fane);
	$effect(() => {
		if (data.fane !== lastFane) {
			lastFane = data.fane;
			wizardMode = 'closed';
			editingCampaign = null;
		}
	});

	function openNew() {
		editingCampaign = null;
		wizardMode = 'new';
	}
	function openEdit(c: CampaignRow) {
		editingCampaign = c;
		wizardMode = 'edit';
	}
	function closeWizard() {
		wizardMode = 'closed';
		editingCampaign = null;
	}
	async function savedWizard() {
		await invalidateAll();
		closeWizard();
	}
	function refresh() {
		return invalidateAll();
	}

	// --- Lenker tab imperative handle (header «Legg til lenke») ---------------
	let lenkerRef = $state<LenkerTab>();
	// --- Sosiale medier imperative handle (header «Nytt innlegg», agency) -----
	let sosialeRef = $state<SosialeTab>();

	const wizardOpen = $derived(wizardMode !== 'closed');
</script>

<svelte:head><title>Markedsføring · NP Dashboard</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Markedsføring</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Kampanjer, lenker, sosiale medier og annonser — samlet.
			</p>
		</div>
		{#if !wizardOpen}
			{#if data.fane === 'kampanjer'}
				<Button variant={data.campaigns.length > 0 ? 'default' : 'outline'} onclick={openNew}>
					<Plus class="size-4" />
					Ny kampanje
				</Button>
			{:else if data.fane === 'lenker'}
				<Button onclick={() => lenkerRef?.openNewLink()}>
					<Plus class="size-4" />
					Legg til lenke
				</Button>
			{:else if data.fane === 'sosiale-medier' && canManage}
				<Button onclick={() => sosialeRef?.openNewPost()}>
					<Plus class="size-4" />
					Nytt innlegg
				</Button>
			{/if}
		{/if}
	</header>

	<!-- Faner -->
	<div class="flex gap-6 overflow-x-auto border-b border-border" role="tablist" aria-label="Markedsføring">
		{#each tabs as t (t.fane)}
			<a
				href="/markedsforing/{t.fane}"
				role="tab"
				aria-selected={data.fane === t.fane}
				class={cn(
					'relative -mb-px whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
					data.fane === t.fane
						? 'border-foreground text-foreground'
						: 'border-transparent text-muted-foreground hover:text-foreground'
				)}
			>
				{t.label}
			</a>
		{/each}
	</div>

	<!-- Innhold -->
	{#if data.fane === 'kampanjer'}
		{#if wizardOpen}
			{#key editingCampaign?.id ?? 'new'}
				<CampaignWizard
					campaign={editingCampaign}
					recipients={data.recipients}
					{businessId}
					{businessName}
					onclose={closeWizard}
					onsaved={savedWizard}
				/>
			{/key}
		{:else}
			<KampanjerTab
				campaigns={data.campaigns}
				{businessId}
				onNew={openNew}
				onEdit={openEdit}
				onchanged={refresh}
			/>
		{/if}
	{:else if data.fane === 'lenker'}
		<LenkerTab
			bind:this={lenkerRef}
			linkPage={data.linkPage}
			links={data.links}
			{businessId}
			{businessName}
			onchanged={refresh}
		/>
	{:else if data.fane === 'sosiale-medier'}
		<SosialeTab
			bind:this={sosialeRef}
			posts={data.posts}
			templates={data.templates}
			{businessId}
			{canManage}
			onchanged={refresh}
		/>
	{:else if data.fane === 'annonser'}
		<AnnonserTab adStatuses={data.adStatuses} />
	{/if}
</div>
