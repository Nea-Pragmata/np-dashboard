<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections } from '$lib/pocketbase-types';
	import { slugify } from '$lib/utils/format';
	import { pbError } from '$lib/utils/errors';
	import type { LinkPageRow } from '../marketing';

	let {
		open = $bindable(false),
		linkPage = null,
		businessId,
		businessName,
		onsaved
	}: {
		open?: boolean;
		/** The existing link page, or `null` to create one for this business. */
		linkPage?: LinkPageRow | null;
		businessId: string;
		businessName: string;
		onsaved?: () => void;
	} = $props();

	const PRESETS = [
		{ value: 'light', label: 'Lys' },
		{ value: 'dark', label: 'Mørk' }
	];

	let title = $state('');
	let bio = $state('');
	let accent = $state('#2E4B40');
	let preset = $state('light');
	let published = $state(true);
	let saving = $state(false);
	let titleError = $state('');

	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = linkPage?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;

		title = linkPage?.title ?? businessName;
		bio = linkPage?.bio ?? '';
		accent = linkPage?.theme?.accent ?? '#2E4B40';
		preset = linkPage?.theme?.preset ?? 'light';
		published = linkPage?.published ?? true;
		titleError = '';
	});

	const presetLabel = $derived(PRESETS.find((p) => p.value === preset)?.label ?? 'Lys');

	async function save() {
		titleError = title.trim() ? '' : 'Skriv en tittel.';
		if (titleError) return;

		saving = true;
		const theme = { accent, preset };
		try {
			if (linkPage) {
				// Customer update rule requires business:isset = false — omit it.
				await pb.collection(Collections.LinkPages).update(linkPage.id, {
					title: title.trim(),
					bio,
					theme,
					published
				});
			} else {
				await pb.collection(Collections.LinkPages).create({
					business: businessId,
					slug: slugify(title) || `lenkeside-${Date.now().toString(36)}`,
					title: title.trim(),
					bio,
					theme,
					published
				});
			}
			toast.success('Lenkesiden er lagret.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title="Rediger lenkeside"
	description="Slik ser den offentlige lenkesiden din ut."
>
	<div class="flex flex-col gap-5">
		<Field.Field data-invalid={titleError ? 'true' : undefined}>
			<Field.Label for="lp-title">Tittel<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="lp-title"
				name="lenkeside-tittel"
				bind:value={title}
				placeholder="F.eks. Oslo Frisør"
				aria-invalid={Boolean(titleError)}
				oninput={() => (titleError = '')}
			/>
			{#if titleError}<Field.Error>{titleError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="lp-bio">Beskrivelse</Field.Label>
			<Textarea
				id="lp-bio"
				name="lenkeside-bio"
				bind:value={bio}
				rows={3}
				placeholder="Kort tekst under tittelen."
			/>
		</Field.Field>

		<div class="flex flex-col gap-4">
			<p class="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Tema</p>
			<Field.Field>
				<Field.Label for="lp-accent">Aksentfarge</Field.Label>
				<div class="flex items-center gap-3">
					<input
						id="lp-accent"
						name="lenkeside-accent"
						type="color"
						bind:value={accent}
						class="h-9 w-14 cursor-pointer rounded-md border border-border bg-card p-1"
						aria-label="Aksentfarge"
					/>
					<span class="text-sm tabular-nums text-muted-foreground">{accent}</span>
				</div>
			</Field.Field>
			<Field.Field>
				<Field.Label for="lp-preset">Utseende</Field.Label>
				<Select.Root type="single" bind:value={preset}>
					<Select.Trigger id="lp-preset" class="w-full">{presetLabel}</Select.Trigger>
					<Select.Content>
						{#each PRESETS as p (p.value)}
							<Select.Item value={p.value} label={p.label}>{p.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</Field.Field>
		</div>

		<div class="flex items-center gap-3 border-t border-border pt-4">
			<Switch id="lp-published" checked={published} onCheckedChange={(c) => (published = c)} />
			<label for="lp-published" class="text-sm text-text-body">Publisert</label>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
