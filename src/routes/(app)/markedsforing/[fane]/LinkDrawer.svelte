<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import { slugify } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import type { LinkRow } from '../marketing';

	let {
		open = $bindable(false),
		link = null,
		kind = 'page',
		businessId,
		linkPageId = null,
		nextSortOrder = 1,
		onsaved
	}: {
		open?: boolean;
		/** The link being edited, or `null` to create a new one. */
		link?: LinkRow | null;
		/** `page` = a button on the link page; `short` = a standalone short link. */
		kind?: 'page' | 'short';
		businessId: string;
		/** The link_page id to attach `page` links to (ignored for `short`). */
		linkPageId?: string | null;
		nextSortOrder?: number;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(link));
	// An existing record keeps its own kind; only new links use the `kind` prop.
	const effectiveKind = $derived(link ? (link.link_page ? 'page' : 'short') : kind);
	const isShort = $derived(effectiveKind === 'short');

	let label = $state('');
	let targetUrl = $state('');
	let code = $state('');
	let active = $state(true);
	let codeTouched = $state(false);
	let saving = $state(false);
	let labelError = $state('');
	let urlError = $state('');
	let codeError = $state('');

	// Re-seed the working copy each time the drawer opens (keyed on link id).
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = link?.id ?? `__new_${kind}__`;
		if (key === lastKey) return;
		lastKey = key;

		label = link?.label ?? '';
		targetUrl = link?.target_url ?? '';
		code = link?.code ?? '';
		active = link?.active ?? true;
		codeTouched = Boolean(link);
		labelError = '';
		urlError = '';
		codeError = '';
	});

	function onLabelInput() {
		labelError = '';
		// Auto-suggest the short code from the label until the user edits it.
		if (!editing && !codeTouched) code = slugify(label);
	}

	async function save() {
		labelError = label.trim() ? '' : 'Skriv en tittel.';
		urlError = targetUrl.trim() ? '' : 'Skriv en URL.';
		code = code.trim();
		codeError = code ? '' : 'Velg en kode.';
		if (labelError || urlError || codeError) return;

		saving = true;
		try {
			if (link) {
				// Customer update rule requires business:isset = false — omit it.
				await pb.collection(Collections.Links).update(link.id, {
					label: label.trim(),
					target_url: targetUrl.trim(),
					code,
					active
				});
				toast.success('Lenken er lagret.');
			} else {
				await pb.collection(Collections.Links).create({
					business: businessId,
					label: label.trim(),
					target_url: targetUrl.trim(),
					code,
					active,
					sort_order: nextSortOrder,
					// Only page links belong to the link page; short links stand alone.
					...(isShort ? {} : { link_page: linkPageId ?? '' })
				});
				toast.success('Lenken er lagt til.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	const title = $derived(
		isShort
			? editing
				? 'Rediger kort lenke'
				: 'Ny kort lenke'
			: editing
				? 'Rediger lenke'
				: 'Ny lenke'
	);
</script>

<Drawer
	bind:open
	{title}
	description={isShort
		? 'En kort lenke videresender til en full URL og teller klikk.'
		: 'En knapp på lenkesiden din.'}
>
	<div class="flex flex-col gap-5">
		<Field.Field data-invalid={labelError ? 'true' : undefined}>
			<Field.Label for="l-label">Tittel<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="l-label"
				name="lenke-tittel"
				bind:value={label}
				placeholder={isShort ? 'F.eks. Sommertilbud' : 'F.eks. Bestill time'}
				aria-invalid={Boolean(labelError)}
				oninput={onLabelInput}
			/>
			{#if labelError}<Field.Error>{labelError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field data-invalid={urlError ? 'true' : undefined}>
			<Field.Label for="l-url">Mål-URL<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="l-url"
				name="lenke-url"
				type="url"
				bind:value={targetUrl}
				placeholder="https://…"
				aria-invalid={Boolean(urlError)}
				oninput={() => (urlError = '')}
			/>
			{#if urlError}<Field.Error>{urlError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field data-invalid={codeError ? 'true' : undefined}>
			<Field.Label for="l-code">Kort kode<span class="text-destructive"> *</span></Field.Label>
			<div class="flex items-center gap-2">
				<span class="shrink-0 text-sm text-muted-foreground">/r/</span>
				<Input
					id="l-code"
					name="lenke-kode"
					bind:value={code}
					placeholder="bestill"
					aria-invalid={Boolean(codeError)}
					oninput={() => {
						codeTouched = true;
						codeError = '';
					}}
				/>
			</div>
			<Field.Description>Må være unik. Brukes i den korte lenken /r/{code || '…'}.</Field.Description>
			{#if codeError}<Field.Error>{codeError}</Field.Error>{/if}
		</Field.Field>

		<div class="flex items-center gap-3 border-t border-border pt-4">
			<Switch id="l-active" checked={active} onCheckedChange={(c) => (active = c)} />
			<label for="l-active" class="text-sm text-text-body">Aktiv</label>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Legg til'}
		</Button>
	{/snippet}
</Drawer>
