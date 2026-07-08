<script lang="ts">
	import type { Component } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Star from '@lucide/svelte/icons/star';
	import Layers from '@lucide/svelte/icons/layers';
	import Globe from '@lucide/svelte/icons/globe';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import TemplateDrawer from './TemplateDrawer.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { Collections, type ContentTemplatesTypeOptions } from '$lib/pocketbase-types';
	import { TEMPLATE_TYPES } from './templates';
	import type { PageData } from './$types';
	import type { TemplateRow } from './+page';

	let { data }: { data: PageData } = $props();

	type IconComponent = Component<{ class?: string }>;
	const TYPE_ICONS: Record<string, IconComponent> = {
		social_post: Share2,
		email: Mail,
		sms: MessageSquare,
		review_reply: Star
	};

	// --- content templates grouped by type -----------------------------------
	const templatesByType = $derived.by(() => {
		const map = new Map<string, TemplateRow[]>();
		for (const t of TEMPLATE_TYPES) map.set(t.value, []);
		for (const tpl of data.templates) map.get(tpl.type)?.push(tpl);
		return map;
	});

	let selectedType = $state<ContentTemplatesTypeOptions>(TEMPLATE_TYPES[0].value);
	const selectedMeta = $derived(TEMPLATE_TYPES.find((t) => t.value === selectedType) ?? TEMPLATE_TYPES[0]);
	const selectedTemplates = $derived(templatesByType.get(selectedType) ?? []);

	// --- attribute schemas grouped by business (read-only overview) ----------
	const schemasByBusiness = $derived.by(() => {
		const map = new Map<string, { name: string; count: number }>();
		for (const s of data.schemas) {
			const name = s.expand?.business?.name ?? 'Ukjent bedrift';
			const entry = map.get(s.business) ?? { name, count: 0 };
			entry.count += 1;
			map.set(s.business, entry);
		}
		return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
	});

	// --- drawer + delete -----------------------------------------------------
	let drawerOpen = $state(false);
	let editingTemplate = $state<TemplateRow | null>(null);
	let drawerType = $state<ContentTemplatesTypeOptions>(TEMPLATE_TYPES[0].value);

	function openCreate() {
		editingTemplate = null;
		drawerType = selectedType;
		drawerOpen = true;
	}
	function openEdit(t: TemplateRow) {
		editingTemplate = t;
		drawerType = t.type;
		drawerOpen = true;
	}

	let confirmOpen = $state(false);
	let toDelete = $state<TemplateRow | null>(null);
	function askDelete(t: TemplateRow) {
		toDelete = t;
		confirmOpen = true;
	}
	async function doDelete() {
		const t = toDelete;
		if (!t) return;
		try {
			await pb.collection(Collections.ContentTemplates).delete(t.id);
			toast.success('Malen er slettet.');
			await invalidateAll();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke slette malen.');
		}
	}

	function refresh() {
		return invalidateAll();
	}

	function scopeName(t: TemplateRow): string {
		return t.business ? (t.expand?.business?.name ?? 'Bedrift') : 'Global';
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
</script>

<svelte:head><title>Maler · NP Admin</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold text-foreground">Maler</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Innholdsmaler kundene kan gjenbruke — globale eller per bedrift.
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="size-4" />
			Ny mal
		</Button>
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Left: type groups + attribute schema overview -->
		<div class="flex flex-col gap-6 lg:col-span-1">
			<!-- Innholdsmaler -->
			<section class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
				<div class="border-b border-border px-4 py-3">
					<h2 class="text-sm font-semibold text-foreground">Innholdsmaler</h2>
				</div>
				<ul>
					{#each TEMPLATE_TYPES as t (t.value)}
						{@const count = templatesByType.get(t.value)?.length ?? 0}
						{@const Icon = TYPE_ICONS[t.value]}
						{@const active = selectedType === t.value}
						<li>
							<button
								type="button"
								onclick={() => (selectedType = t.value)}
								aria-current={active ? 'true' : undefined}
								class={[
									'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left outline-none transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
									active ? 'bg-muted' : 'hover:bg-muted/60'
								]}
							>
								<Icon class="size-4 shrink-0 text-text-subtle" />
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-medium text-foreground">{t.label}</span>
									<span class="block text-xs text-muted-foreground">
										{count}
										{count === 1 ? 'mal' : 'maler'}
									</span>
								</span>
								<ChevronRight class="size-4 shrink-0 text-text-subtle" />
							</button>
						</li>
					{/each}
				</ul>
			</section>

			<!-- Attributt-skjemaer (read-only overview) -->
			<section class="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
				<div class="border-b border-border px-4 py-3">
					<h2 class="text-sm font-semibold text-foreground">Attributt-skjemaer</h2>
				</div>
				{#if schemasByBusiness.length === 0}
					<p class="px-4 py-6 text-sm text-muted-foreground">Ingen bransjefelter satt opp ennå.</p>
				{:else}
					<ul>
						{#each schemasByBusiness as s (s.name)}
							<li class="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
								<Layers class="size-4 shrink-0 text-text-subtle" />
								<span class="min-w-0 flex-1 truncate text-sm text-foreground">{s.name}</span>
								<span class="shrink-0 text-xs text-muted-foreground">
									{s.count}
									{s.count === 1 ? 'felt' : 'felter'}
								</span>
							</li>
						{/each}
					</ul>
					<p class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
						Bransjefeltene redigeres per bedrift i Katalog.
					</p>
				{/if}
			</section>
		</div>

		<!-- Right: templates of the selected type -->
		<section class="flex flex-col overflow-hidden rounded-lg border border-border bg-card lg:col-span-2">
			<div class="flex items-start justify-between gap-3 border-b border-border p-4">
				<div class="min-w-0">
					<h2 class="text-base font-semibold text-foreground">{selectedMeta.label}</h2>
					<p class="mt-0.5 text-sm text-muted-foreground">{selectedMeta.helper}</p>
				</div>
				<Button variant="ghost" size="sm" class="shrink-0" onclick={openCreate}>
					<Plus class="size-4" />
					Ny mal
				</Button>
			</div>

			{#if selectedTemplates.length === 0}
				<EmptyState
					icon={TYPE_ICONS[selectedType]}
					title="Ingen maler ennå"
					description="Lag den første malen for denne typen, så kan kundene gjenbruke den."
					class="py-12"
				/>
			{:else}
				<ul class="divide-y divide-border">
					{#each selectedTemplates as t (t.id)}
						<li class="flex items-start gap-3 px-4 py-3.5">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="text-sm font-medium text-foreground">{t.name}</span>
									<span
										class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
									>
										{#if !t.business}
											<Globe class="size-3" aria-hidden="true" />
										{/if}
										{scopeName(t)}
									</span>
								</div>
								<p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>
							</div>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {t.name}">
									<Ellipsis class="size-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onSelect={() => openEdit(t)}>Rediger</DropdownMenu.Item>
									<DropdownMenu.Item variant="destructive" onSelect={() => askDelete(t)}>
										Slett
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<TemplateDrawer
	bind:open={drawerOpen}
	template={editingTemplate}
	defaultType={drawerType}
	businesses={data.businesses}
	onsaved={refresh}
/>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Slette malen?"
	description={toDelete ? `«${toDelete.name}» slettes for godt.` : undefined}
	confirmLabel="Slett"
	destructive
	onconfirm={doDelete}
/>
