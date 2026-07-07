<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import {
		Collections,
		SocialPostsChannelOptions,
		SocialPostsStatusOptions
	} from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import { statusMeta } from '$lib/components/shared/StatusBadge.svelte';
	import { channelLabel, type SocialPostRow } from '../marketing';

	let {
		open = $bindable(false),
		post = null,
		prefillBody = '',
		businessId,
		onsaved
	}: {
		open?: boolean;
		/** The post being edited, or `null` to create a new one. */
		post?: SocialPostRow | null;
		/** Body to seed a NEW post with (e.g. when starting from a template). */
		prefillBody?: string;
		businessId: string;
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(post));

	const CHANNELS = [
		{ value: SocialPostsChannelOptions.instagram, label: channelLabel('instagram') },
		{ value: SocialPostsChannelOptions.facebook, label: channelLabel('facebook') }
	];
	// The four workflow states the agency moves a post through.
	const STATUSES = (
		['draft', 'pending_approval', 'approved', 'published'] as const
	).map((s) => ({ value: s, label: statusMeta('social_posts', s).label }));

	let channel = $state<string>(SocialPostsChannelOptions.instagram);
	let content = $state('');
	let scheduledDate = $state('');
	let status = $state<string>(SocialPostsStatusOptions.draft);
	let contentError = $state('');
	let saving = $state(false);

	// Re-seed the working copy each time the drawer opens (keyed on post id).
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = post?.id ?? '__new__';
		if (key === lastKey) return;
		lastKey = key;

		channel = post?.channel ?? SocialPostsChannelOptions.instagram;
		content = post?.content ?? prefillBody;
		// Stored as "YYYY-MM-DD HH:mm:ss.sssZ" — the leading 10 chars are the date.
		scheduledDate = post?.scheduled_at ? post.scheduled_at.slice(0, 10) : '';
		status = post?.status ?? SocialPostsStatusOptions.draft;
		contentError = '';
	});

	const channelText = $derived(CHANNELS.find((c) => c.value === channel)?.label ?? '');
	const statusText = $derived(STATUSES.find((s) => s.value === status)?.label ?? '');

	async function save() {
		contentError = content.trim() ? '' : 'Skriv innholdet i innlegget.';
		if (contentError) return;

		// Anchor a scheduled post at 09:00 UTC (matches the seed convention) so it
		// never drifts across a local midnight boundary in the calendar.
		const scheduled_at = scheduledDate ? `${scheduledDate}T09:00:00.000Z` : '';

		saving = true;
		try {
			if (post) {
				// Agency (BY) update — omit `business` so it is never rewritten.
				await pb.collection(Collections.SocialPosts).update(post.id, {
					channel,
					content: content.trim(),
					scheduled_at,
					status
				});
				toast.success('Innlegget er lagret.');
			} else {
				await pb.collection(Collections.SocialPosts).create({
					business: businessId,
					channel,
					content: content.trim(),
					scheduled_at,
					status
				});
				toast.success('Innlegget er opprettet.');
			}
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
	title={editing ? 'Rediger innlegg' : 'Nytt innlegg'}
	description="Innholdet publiseres først når kunden har godkjent det."
>
	<div class="flex flex-col gap-5">
		<Field.Field>
			<Field.Label for="sp-channel">Kanal</Field.Label>
			<Select.Root type="single" bind:value={channel}>
				<Select.Trigger id="sp-channel" class="w-full">{channelText}</Select.Trigger>
				<Select.Content>
					{#each CHANNELS as c (c.value)}
						<Select.Item value={c.value} label={c.label}>{c.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>

		<Field.Field data-invalid={contentError ? 'true' : undefined}>
			<Field.Label for="sp-content">Innhold<span class="text-destructive"> *</span></Field.Label>
			<Textarea
				id="sp-content"
				name="innlegg-innhold"
				bind:value={content}
				rows={6}
				placeholder="Skriv innlegget …"
				aria-invalid={Boolean(contentError)}
				oninput={() => (contentError = '')}
			/>
			{#if contentError}<Field.Error>{contentError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="sp-date">Planlagt dato</Field.Label>
			<Input id="sp-date" name="innlegg-dato" type="date" bind:value={scheduledDate} />
			<Field.Description>La stå tom for et innlegg uten fast dato ennå.</Field.Description>
		</Field.Field>

		<Field.Field>
			<Field.Label for="sp-status">Status</Field.Label>
			<Select.Root type="single" bind:value={status}>
				<Select.Trigger id="sp-status" class="w-full">{statusText}</Select.Trigger>
				<Select.Content>
					{#each STATUSES as s (s.value)}
						<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Opprett innlegg'}
		</Button>
	{/snippet}
</Drawer>
