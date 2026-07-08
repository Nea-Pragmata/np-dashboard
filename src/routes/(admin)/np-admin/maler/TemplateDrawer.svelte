<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { pbError } from '$lib/utils/errors';
	import { Collections, type ContentTemplatesTypeOptions } from '$lib/pocketbase-types';
	import { TEMPLATE_TYPES } from './templates';
	import type { TemplateRow, BusinessRow } from './+page';

	let {
		open = $bindable(false),
		template = null,
		defaultType,
		businesses = [],
		onsaved
	}: {
		open?: boolean;
		/** The template being edited, or `null` to create a new one. */
		template?: TemplateRow | null;
		/** Type pre-selected when creating (the group the user is viewing). */
		defaultType: ContentTemplatesTypeOptions;
		businesses?: BusinessRow[];
		onsaved?: () => void;
	} = $props();

	const GLOBAL = '';

	// Seeded from a constant (not the `defaultType` prop) to avoid capturing the
	// prop's initial value; the open-effect below re-seeds it from defaultType.
	let type = $state<string>(TEMPLATE_TYPES[0].value);
	let name = $state('');
	let body = $state('');
	let scope = $state<string>(GLOBAL);
	let saving = $state(false);

	const editing = $derived(Boolean(template));

	// Re-seed the form whenever the drawer opens for a different template (or for
	// a fresh create), so an in-progress edit is never clobbered by a re-render.
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = template?.id ?? `new:${defaultType}`;
		if (key === lastKey) return;
		lastKey = key;

		type = template?.type ?? defaultType;
		name = template?.name ?? '';
		body = template?.body ?? '';
		scope = template?.business ?? GLOBAL;
	});

	const typeLabel = $derived(TEMPLATE_TYPES.find((t) => t.value === type)?.label ?? 'Velg type');
	const scopeLabel = $derived(
		scope === GLOBAL
			? 'Alle bedrifter (global)'
			: (businesses.find((b) => b.id === scope)?.name ?? 'Ukjent bedrift')
	);

	const canSave = $derived(Boolean(name.trim() && body.trim() && type && !saving));

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const payload = { type, name: name.trim(), body: body.trim(), business: scope };
			if (template) {
				await pb.collection(Collections.ContentTemplates).update(template.id, payload);
				toast.success('Malen er oppdatert.');
			} else {
				await pb.collection(Collections.ContentTemplates).create(payload);
				toast.success('Malen er opprettet.');
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre malen.');
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title={editing ? 'Rediger mal' : 'Ny mal'}
	description="Maler er tekstforslag kunden kan bruke. Bruk {'{'}felt{'}'} for flettefelt."
>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1.5">
			<Label for="tpl-type">Type</Label>
			<Select.Root type="single" bind:value={type}>
				<Select.Trigger id="tpl-type" class="w-full">{typeLabel}</Select.Trigger>
				<Select.Content>
					{#each TEMPLATE_TYPES as t (t.value)}
						<Select.Item value={t.value} label={t.label}>{t.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="tpl-name">Navn</Label>
			<Input id="tpl-name" name="tpl-name" bind:value={name} placeholder="F.eks. Tilbudspost" />
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="tpl-scope">Gjelder</Label>
			<Select.Root type="single" bind:value={scope}>
				<Select.Trigger id="tpl-scope" class="w-full">{scopeLabel}</Select.Trigger>
				<Select.Content>
					<Select.Item value={GLOBAL} label="Alle bedrifter (global)">
						Alle bedrifter (global)
					</Select.Item>
					{#each businesses as b (b.id)}
						<Select.Item value={b.id} label={b.name}>{b.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<p class="text-xs text-muted-foreground">
				Global gjelder alle kunder. Velg en bedrift for en egen variant.
			</p>
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="tpl-body">Innhold</Label>
			<Textarea
				id="tpl-body"
				name="tpl-body"
				bind:value={body}
				rows={6}
				placeholder="Skriv malteksten. Bruk {'{'}navn{'}'}, {'{'}dato{'}'} osv. for flettefelt."
			/>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Opprett mal'}
		</Button>
	{/snippet}
</Drawer>
