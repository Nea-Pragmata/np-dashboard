<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import MousePointerClick from '@lucide/svelte/icons/mouse-pointer-click';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Plus from '@lucide/svelte/icons/plus';
	import LinkIcon from '@lucide/svelte/icons/link';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import KpiCard from '$lib/components/shared/KpiCard.svelte';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import LinkDrawer from './LinkDrawer.svelte';
	import LinkPageDrawer from './LinkPageDrawer.svelte';
	import { formatNumber, initials } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import { formatDayMonth, type LinkPageRow, type LinkRow } from '../marketing';

	let {
		linkPage,
		links,
		businessId,
		businessName,
		onchanged
	}: {
		linkPage: LinkPageRow | null;
		links: LinkRow[];
		businessId: string;
		businessName: string;
		onchanged: () => void;
	} = $props();

	// Links attached to the link page are its buttons; the rest are standalone
	// short links (the /r/{code} redirectors shown under «Korte lenker»).
	const pageLinks = $derived(links.filter((l) => l.link_page));
	const shortLinks = $derived(links.filter((l) => !l.link_page));
	const activePageLinks = $derived(pageLinks.filter((l) => l.active !== false));

	const totalClicks = $derived(links.reduce((sum, l) => sum + (l.click_count ?? 0), 0));
	const visits = $derived(linkPage?.visit_count ?? 0);
	const topLink = $derived(
		links.reduce<LinkRow | null>(
			(best, l) => ((l.click_count ?? 0) > (best?.click_count ?? -1) ? l : best),
			null
		)
	);

	const nextPageSort = $derived(
		pageLinks.reduce((max, l) => Math.max(max, l.sort_order ?? 0), 0) + 1
	);
	const nextShortSort = $derived(
		shortLinks.reduce((max, l) => Math.max(max, l.sort_order ?? 0), 0) + 1
	);

	const accent = $derived(linkPage?.theme?.accent ?? '#2E4B40');
	const pageTitle = $derived(linkPage?.title ?? businessName);

	/** Strip the protocol for a compact "domain/path" label. */
	function shortUrl(url: string): string {
		return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
	}

	// --- link drawer (shared for page + short links) -------------------------
	let linkDrawerOpen = $state(false);
	let editingLink = $state<LinkRow | null>(null);
	let linkKind = $state<'page' | 'short'>('page');

	/** Exposed to the page shell so the header «Legg til lenke» button can open it. */
	export function openNewLink() {
		editingLink = null;
		linkKind = 'page';
		linkDrawerOpen = true;
	}
	function openNewShort() {
		editingLink = null;
		linkKind = 'short';
		linkDrawerOpen = true;
	}
	function editLink(l: LinkRow) {
		editingLink = l;
		linkKind = l.link_page ? 'page' : 'short';
		linkDrawerOpen = true;
	}

	async function toggleActive(l: LinkRow, checked: boolean) {
		try {
			// Customer update rule requires business:isset = false — omit it.
			await pb.collection(Collections.Links).update(l.id, { active: checked });
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
			onchanged();
		}
	}

	// --- delete --------------------------------------------------------------
	let deleteOpen = $state(false);
	let deleteTarget = $state<LinkRow | null>(null);
	function askDelete(l: LinkRow) {
		deleteTarget = l;
		deleteOpen = true;
	}
	async function confirmDelete() {
		const l = deleteTarget;
		if (!l) return;
		try {
			await pb.collection(Collections.Links).delete(l.id);
			toast.success('Lenken er slettet.');
			onchanged();
		} catch (e) {
			toast.error(pbError(e));
		}
	}

	// --- link page editor ----------------------------------------------------
	let pageDrawerOpen = $state(false);

	function seePage() {
		toast.info('Den offentlige lenkesiden får en egen adresse når domenet er koblet til.');
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
	const cardHeader = 'flex items-center justify-between gap-3 border-b border-border px-5 py-4';
</script>

<div class="flex flex-col gap-6">
	<!-- KPI-er -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<KpiCard label="Besøk på lenkesiden" value={visits} icon={Eye} />
		<KpiCard label="Klikk på lenker" value={totalClicks} icon={MousePointerClick} />
		<div class="flex min-h-[120px] flex-col gap-2 rounded-lg border border-border bg-card p-5">
			<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
				Mest klikket
			</p>
			<p class="truncate text-xl font-semibold text-foreground">
				{topLink?.label ?? '—'}
			</p>
			{#if topLink}
				<p class="text-xs text-muted-foreground tabular-nums">
					{formatNumber(topLink.click_count ?? 0)} klikk
				</p>
			{/if}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Venstre kolonne: lenkeside + korte lenker -->
		<div class="flex flex-col gap-6 lg:col-span-2">
			<!-- Din lenkeside -->
			<section class="overflow-hidden rounded-lg border border-border bg-card">
				<div class={cardHeader}>
					<h3 class="text-base font-semibold text-foreground">Din lenkeside</h3>
					<div class="flex items-center gap-1">
						<Button variant="ghost" size="sm" onclick={() => (pageDrawerOpen = true)}>
							Rediger lenkeside
						</Button>
						<Button variant="ghost" size="sm" onclick={seePage}>
							<ExternalLink class="size-4" />
							Se siden
						</Button>
					</div>
				</div>

				{#if pageLinks.length === 0}
					<EmptyState
						icon={LinkIcon}
						title="Ingen lenker ennå"
						description="Legg til den første knappen kundene ser på lenkesiden din."
						class="py-10"
					/>
				{:else}
					<ul>
						{#each pageLinks as l (l.id)}
							<li class="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
								<GripVertical class="size-4 shrink-0 cursor-grab text-text-subtle" aria-hidden="true" />
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-foreground">{l.label}</p>
									<p class="truncate text-xs text-muted-foreground">{shortUrl(l.target_url)}</p>
								</div>
								<Switch
									checked={l.active !== false}
									onCheckedChange={(c) => toggleActive(l, c)}
									aria-label="Aktiver {l.label}"
								/>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {l.label}">
										<Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onSelect={() => editLink(l)}>Rediger</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive data-highlighted:text-destructive"
											onSelect={() => askDelete(l)}
										>
											Slett
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="border-t border-border px-5 py-3">
					<Button variant="ghost" size="sm" onclick={openNewLink}>
						<Plus class="size-4" />
						Legg til lenke
					</Button>
				</div>
			</section>

			<!-- Korte lenker -->
			<section class="overflow-hidden rounded-lg border border-border bg-card">
				<div class={cardHeader}>
					<h3 class="text-base font-semibold text-foreground">Korte lenker</h3>
					<Button variant="ghost" size="sm" onclick={openNewShort}>
						<Plus class="size-4" />
						Ny kort lenke
					</Button>
				</div>

				{#if shortLinks.length === 0}
					<EmptyState
						icon={LinkIcon}
						title="Ingen korte lenker ennå"
						description="Lag en kort /r/-lenke du kan dele, og følg klikkene her."
						class="py-10"
					/>
				{:else}
					<table class="w-full border-collapse">
						<thead>
							<tr
								class="h-10 border-b border-border [&>th]:whitespace-nowrap [&>th]:px-2 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-muted-foreground [&>th:first-child]:pl-5 [&>th:last-child]:pr-5"
							>
								<th>Kort lenke</th>
								<th>Mål</th>
								<th><div class="text-right">Klikk</div></th>
								<th>Opprettet</th>
								<th class="w-[52px]"><span class="sr-only">Handlinger</span></th>
							</tr>
						</thead>
						<tbody>
							{#each shortLinks as l (l.id)}
								<tr
									class="h-[52px] border-b border-border last:border-b-0 [&>td]:px-2 [&>td]:align-middle [&>td]:text-sm [&>td:first-child]:pl-5 [&>td:last-child]:pr-5"
								>
									<td class="font-medium text-accent-blue-text">/r/{l.code}</td>
									<td class="text-muted-foreground">{l.label}</td>
									<td class="text-right tabular-nums text-foreground">
										{formatNumber(l.click_count ?? 0)}
									</td>
									<td class="whitespace-nowrap text-muted-foreground">{formatDayMonth(l.created)}</td>
									<td>
										<div class="flex justify-end">
											<DropdownMenu.Root>
												<DropdownMenu.Trigger
													class={triggerClass}
													aria-label="Handlinger for {l.label}"
												>
													<Ellipsis class="size-4" />
												</DropdownMenu.Trigger>
												<DropdownMenu.Content align="end">
													<DropdownMenu.Item onSelect={() => editLink(l)}>Rediger</DropdownMenu.Item>
													<DropdownMenu.Separator />
													<DropdownMenu.Item
														class="text-destructive data-highlighted:text-destructive"
														onSelect={() => askDelete(l)}
													>
														Slett
													</DropdownMenu.Item>
												</DropdownMenu.Content>
											</DropdownMenu.Root>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		</div>

		<!-- Høyre kolonne: forhåndsvisning -->
		<section class="rounded-lg border border-border bg-card p-6">
			<h3 class="mb-4 text-base font-semibold text-foreground">Forhåndsvisning</h3>
			<div class="rounded-2xl bg-muted/50 p-5">
				<div class="mx-auto flex max-w-[240px] flex-col items-center gap-3">
					<span
						class="flex size-14 items-center justify-center rounded-full text-base font-semibold text-white"
						style="background-color: {accent};"
						aria-hidden="true"
					>
						{initials(pageTitle)}
					</span>
					<p class="text-center text-sm font-semibold text-foreground">{pageTitle}</p>
					{#if linkPage?.bio}
						<p class="text-center text-xs text-muted-foreground">{linkPage.bio}</p>
					{/if}
					<div class="mt-2 flex w-full flex-col gap-2">
						{#if activePageLinks.length === 0}
							<p class="text-center text-xs text-muted-foreground">Ingen aktive lenker ennå.</p>
						{:else}
							{#each activePageLinks as l (l.id)}
								<span
									class="truncate rounded-full border border-border bg-card px-4 py-2 text-center text-sm font-medium text-foreground"
								>
									{l.label}
								</span>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</section>
	</div>
</div>

<LinkDrawer
	bind:open={linkDrawerOpen}
	link={editingLink}
	kind={linkKind}
	{businessId}
	linkPageId={linkPage?.id ?? null}
	nextSortOrder={linkKind === 'short' ? nextShortSort : nextPageSort}
	onsaved={onchanged}
/>
<LinkPageDrawer
	bind:open={pageDrawerOpen}
	{linkPage}
	{businessId}
	{businessName}
	onsaved={onchanged}
/>
<ConfirmDialog
	bind:open={deleteOpen}
	title="Slette lenken?"
	description={deleteTarget
		? `«${deleteTarget.label}» slettes. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Slett"
	cancelLabel="Avbryt"
	destructive
	onconfirm={confirmDelete}
/>
