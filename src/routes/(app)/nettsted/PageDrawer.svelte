<script lang="ts">
	import ImageIcon from '@lucide/svelte/icons/image';
	import Info from '@lucide/svelte/icons/info';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections, type PagesResponse } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';

	let {
		open = $bindable(false),
		page = null,
		onsaved
	}: {
		open?: boolean;
		/** The page being edited (this drawer only edits — the agency creates pages). */
		page?: PagesResponse | null;
		/** Called after a successful save so the parent can invalidate its load. */
		onsaved?: () => void;
	} = $props();

	// --- form working copy ---------------------------------------------------
	let heading = $state('');
	let introText = $state('');
	let saving = $state(false);
	let headingError = $state('');
	let introError = $state('');

	// Re-seed the working copy each time the drawer opens on a page (keyed on the
	// page id so it never fights the user's in-progress edits).
	let lastKey = '';
	$effect(() => {
		if (!open || !page) {
			lastKey = '';
			return;
		}
		if (page.id === lastKey) return;
		lastKey = page.id;
		heading = page.heading ?? '';
		introText = page.intro_text ?? '';
		headingError = '';
		introError = '';
	});

	/** Thumbnail URL for an existing image on the page record. */
	function thumbUrl(rec: PagesResponse, filename: string): string {
		return pb.files.getURL(rec, filename, { thumb: '200x150' });
	}

	async function save() {
		if (!page) return;
		headingError = heading.trim() ? '' : 'Overskrift må fylles ut.';
		introError = introText.trim() ? '' : 'Introtekst må fylles ut.';
		if (headingError || introError) return;

		saving = true;
		try {
			// Customer (owner) update: send ONLY the content the tenant may change.
			// The pages update rule blocks `business`, `status` and `slug` — the
			// AGENCY controls publishing, so those are never part of the payload.
			await pb.collection(Collections.Pages).update(page.id, {
				heading: heading.trim(),
				intro_text: introText.trim()
			});
			toast.success('Endringene er lagret. Byrået publiserer dem innen én virkedag.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	const capsLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer bind:open title={page ? `Rediger: ${page.name}` : 'Rediger side'}>
	<div class="flex flex-col gap-5">
		<!-- Overskrift -->
		<Field.Field data-invalid={headingError ? 'true' : undefined}>
			<Field.Label for="page-heading">Overskrift<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="page-heading"
				bind:value={heading}
				placeholder="Overskriften øverst på siden"
				aria-invalid={Boolean(headingError)}
				oninput={() => (headingError = '')}
			/>
			{#if headingError}<Field.Error>{headingError}</Field.Error>{/if}
		</Field.Field>

		<!-- Introtekst -->
		<Field.Field data-invalid={introError ? 'true' : undefined}>
			<Field.Label for="page-intro">Introtekst<span class="text-destructive"> *</span></Field.Label>
			<Textarea
				id="page-intro"
				bind:value={introText}
				rows={5}
				placeholder="Kort tekst som ønsker besøkende velkommen."
				aria-invalid={Boolean(introError)}
				oninput={() => (introError = '')}
			/>
			{#if introError}<Field.Error>{introError}</Field.Error>{/if}
		</Field.Field>

		<!-- Bilder (visning — opplasting håndteres av byrået inntil videre) -->
		<div class="flex flex-col gap-3">
			<p class={capsLabel}>Bilder</p>
			{#if page?.images?.length}
				<div class="flex flex-wrap gap-3">
					{#each page.images as file (file)}
						<div
							class="relative flex h-[75px] w-[100px] items-center justify-center overflow-hidden rounded-md bg-muted text-text-subtle"
						>
							<ImageIcon class="size-5" aria-hidden="true" />
							<img
								src={thumbUrl(page, file)}
								alt={page.heading}
								loading="lazy"
								class="absolute inset-0 h-full w-full object-cover"
								onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
							/>
						</div>
					{/each}
				</div>
			{:else}
				<div
					class="flex h-[75px] w-[100px] items-center justify-center rounded-md bg-muted text-text-subtle"
				>
					<ImageIcon class="size-5" aria-hidden="true" />
				</div>
			{/if}
			<p class="flex items-start gap-2 text-xs text-text-subtle">
				<Info class="mt-px size-3.5 shrink-0" aria-hidden="true" />
				<span>Bildeopplasting kommer snart. Ta kontakt med byrået for å bytte bilder.</span>
			</p>
		</div>

		<!-- Byrået publiserer -->
		<p
			class="rounded-lg bg-accent-blue-bg px-3 py-2.5 text-xs leading-relaxed text-accent-blue-text"
		>
			Endringene dine publiseres av byrået innen én virkedag.
		</p>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
