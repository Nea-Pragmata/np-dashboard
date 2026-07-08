<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import {
		Collections,
		AgencyMembersRoleOptions,
		AgencyMembersStatusOptions
	} from '$lib/pocketbase-types';
	import { ROLE_OPTIONS, STATUS_OPTIONS, generateRecordId, generatePassword } from './access';
	import type { MemberRow, BusinessRow } from './+page';

	let {
		open = $bindable(false),
		member = null,
		businesses = [],
		onsaved
	}: {
		open?: boolean;
		/** The membership being edited, or `null` to invite a new byråbruker. */
		member?: MemberRow | null;
		businesses?: BusinessRow[];
		onsaved?: () => void;
	} = $props();

	const editing = $derived(Boolean(member));

	// --- working copy --------------------------------------------------------
	let name = $state('');
	let email = $state('');
	let role = $state<string>(AgencyMembersRoleOptions.staff);
	let status = $state<string>(AgencyMembersStatusOptions.invited);
	let limitScope = $state(false);
	let scopeIds = $state<string[]>([]);
	let note = $state('');
	let saving = $state(false);

	// Re-seed the form each time the drawer opens for a different member (or a
	// fresh invite) so an in-progress edit is never clobbered by a re-render.
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = member?.id ?? 'new';
		if (key === lastKey) return;
		lastKey = key;

		if (member) {
			name = member.expand?.user?.name ?? '';
			email = member.expand?.user?.email ?? '';
			role = member.role;
			status = member.status;
			const allowed = member.allowed_businesses ?? [];
			limitScope = allowed.length > 0;
			scopeIds = [...allowed];
			note = member.note ?? '';
		} else {
			name = '';
			email = '';
			role = AgencyMembersRoleOptions.staff;
			status = AgencyMembersStatusOptions.invited;
			limitScope = false;
			scopeIds = [];
			note = '';
		}
	});

	const isOwnerRole = $derived(role === AgencyMembersRoleOptions.owner);
	const roleLabel = $derived(ROLE_OPTIONS.find((r) => r.value === role)?.label ?? 'Byråansatt');
	const statusLabel = $derived(STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Aktiv');

	function toggleBiz(id: string, on: boolean) {
		scopeIds = on ? [...scopeIds, id] : scopeIds.filter((x) => x !== id);
	}

	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
	// A scoped byråansatt must have at least one business; a byråeier is always all.
	const scopeOk = $derived(isOwnerRole || !limitScope || scopeIds.length > 0);
	const canSave = $derived(
		!saving && scopeOk && (editing || (name.trim().length > 0 && emailValid))
	);

	async function save() {
		if (!canSave) return;
		saving = true;
		// A byråeier always has all-access; a byråansatt's scope is empty (= all)
		// unless explicitly limited.
		const allowed = isOwnerRole || !limitScope ? [] : scopeIds;
		try {
			if (member) {
				// Edit: agency_members.update (BE). We never touch the user account
				// here — only the membership's role / scope / status / note.
				await pb.collection(Collections.AgencyMembers).update(member.id, {
					role,
					allowed_businesses: allowed,
					status,
					note: note.trim()
				});
				toast.success('Tilgangen er oppdatert.');
			} else {
				// Invite: create the (invited) user account and its membership in one
				// atomic batch — a client-provided user id links the two. The user
				// gets a throwaway password and sets their own via the invite.
				const userId = generateRecordId();
				const password = generatePassword();
				const batch = pb.createBatch();
				batch.collection(Collections.Users).create({
					id: userId,
					email: email.trim(),
					name: name.trim(),
					role: 'staff',
					business: '',
					status: 'invited',
					emailVisibility: true,
					password,
					passwordConfirm: password
				});
				batch.collection(Collections.AgencyMembers).create({
					user: userId,
					role,
					allowed_businesses: allowed,
					status: AgencyMembersStatusOptions.invited,
					invited_by: auth.user?.id ?? undefined,
					note: note.trim()
				});
				await batch.send();
				toast.success(`${name.trim()} er invitert.`);
			}
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e) || 'Kunne ikke lagre tilgangen.');
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<Drawer
	bind:open
	title={editing ? 'Rediger tilgang' : 'Inviter byråbruker'}
	description={editing
		? 'Endre rolle, tilgang og status for byråbrukeren.'
		: 'Inviter en kollega til NP Admin og velg hvilke bedrifter de får tilgang til.'}
>
	<div class="flex flex-col gap-6">
		<!-- Bruker -->
		{#if editing}
			<div class="flex flex-col gap-1">
				<p class={sectionLabel}>Bruker</p>
				<p class="text-sm font-medium text-foreground">{name || '—'}</p>
				<p class="text-sm text-muted-foreground">{email || '—'}</p>
			</div>
		{:else}
			<div class="flex flex-col gap-1.5">
				<Label for="member-name">Navn</Label>
				<Input id="member-name" bind:value={name} placeholder="Fornavn Etternavn" autocomplete="off" />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="member-email">E-post</Label>
				<Input
					id="member-email"
					type="email"
					bind:value={email}
					placeholder="navn@byraet.no"
					autocomplete="off"
				/>
				{#if email.trim() && !emailValid}
					<p class="text-sm text-error">Skriv inn en gyldig e-postadresse.</p>
				{/if}
			</div>
		{/if}

		<!-- Rolle -->
		<div class="flex flex-col gap-1.5 border-t border-border pt-5">
			<Label for="member-role">Rolle</Label>
			<Select.Root type="single" bind:value={role}>
				<Select.Trigger id="member-role" class="w-full">{roleLabel}</Select.Trigger>
				<Select.Content>
					{#each ROLE_OPTIONS as r (r.value)}
						<Select.Item value={r.value} label={r.label}>{r.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<p class="text-sm text-muted-foreground">
				{#if isOwnerRole}
					Byråeier har full tilgang: bedrifter, priser, tilganger og AI-jobber.
				{:else}
					Byråansatt jobber med drift og innhold for tildelte bedrifter — ser ikke Pakker & priser
					eller Tilganger.
				{/if}
			</p>
		</div>

		<!-- Tilgang til bedrifter -->
		<div class="flex flex-col gap-3 border-t border-border pt-5">
			<p class={sectionLabel}>Tilgang til bedrifter</p>
			{#if isOwnerRole}
				<p class="text-sm text-muted-foreground">Byråeiere har tilgang til alle bedrifter.</p>
			{:else}
				<label for="member-limit" class="flex cursor-pointer items-center gap-3 py-1">
					<span class="min-w-0 flex-1 text-sm text-foreground">Begrens til utvalgte bedrifter</span>
					<Switch id="member-limit" bind:checked={limitScope} />
				</label>
				{#if limitScope}
					<div
						class="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border"
					>
						{#each businesses as b (b.id)}
							<label for="scope-{b.id}" class="flex cursor-pointer items-center gap-3 px-3 py-2.5">
								<Checkbox
									id="scope-{b.id}"
									checked={scopeIds.includes(b.id)}
									onCheckedChange={(v) => toggleBiz(b.id, v === true)}
								/>
								<span class="min-w-0 flex-1 truncate text-sm text-foreground">{b.name}</span>
							</label>
						{/each}
					</div>
					{#if scopeIds.length === 0}
						<p class="text-sm text-error">Velg minst én bedrift, eller slå av begrensningen.</p>
					{/if}
				{:else}
					<p class="text-sm text-muted-foreground">Har tilgang til alle bedrifter.</p>
				{/if}
			{/if}
		</div>

		<!-- Status (edit only) -->
		{#if editing}
			<div class="flex flex-col gap-1.5 border-t border-border pt-5">
				<Label for="member-status">Status</Label>
				<Select.Root type="single" bind:value={status}>
					<Select.Trigger id="member-status" class="w-full">{statusLabel}</Select.Trigger>
					<Select.Content>
						{#each STATUS_OPTIONS as s (s.value)}
							<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}

		<!-- Notat -->
		<div class="flex flex-col gap-1.5 border-t border-border pt-5">
			<Label for="member-note">Notat (valgfritt)</Label>
			<Textarea id="member-note" bind:value={note} rows={2} placeholder="Intern kommentar …" />
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={!canSave}>
			{saving ? 'Lagrer …' : editing ? 'Lagre endringer' : 'Send invitasjon'}
		</Button>
	{/snippet}
</Drawer>
