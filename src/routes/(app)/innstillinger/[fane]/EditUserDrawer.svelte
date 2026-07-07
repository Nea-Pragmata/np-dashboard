<script lang="ts">
	import { ClientResponseError } from 'pocketbase';
	import { toast } from 'svelte-sonner';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { Collections, UsersRoleOptions, type UsersResponse } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import { roleLabel } from '$lib/utils/format';

	let {
		open = $bindable(false),
		user = null,
		canEditRole = false,
		onsaved
	}: {
		open?: boolean;
		user?: UsersResponse | null;
		/** Owner editing another user may change the role; self-edit is name-only. */
		canEditRole?: boolean;
		onsaved?: () => void;
	} = $props();

	let name = $state('');
	let role = $state<string>(UsersRoleOptions.staff);
	let nameError = $state('');
	let saving = $state(false);

	// Re-seed each time the drawer opens for a (possibly different) user.
	let lastKey = '';
	$effect(() => {
		if (!open) {
			lastKey = '';
			return;
		}
		const key = user?.id ?? '';
		if (key === lastKey) return;
		lastKey = key;
		name = user?.name ?? '';
		role = user?.role ?? UsersRoleOptions.staff;
		nameError = '';
	});

	function editError(e: unknown): string {
		if (e instanceof ClientResponseError && e.status === 403) {
			return 'Du har ikke tilgang til å endre denne brukeren.';
		}
		return pbError(e);
	}

	async function save() {
		if (!user) return;
		nameError = name.trim() ? '' : 'Navn må fylles ut.';
		if (nameError) return;

		// NEVER send `business` (the update rule requires business:isset = false for
		// both the self-edit and owner-edits-staff branches). Role only when allowed.
		const body: { name: string; role?: string } = { name: name.trim() };
		if (canEditRole) body.role = role;

		saving = true;
		try {
			await pb.collection(Collections.Users).update(user.id, body);
			toast.success('Brukeren er lagret.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(editError(e));
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title={canEditRole ? 'Rediger bruker' : 'Rediger min profil'}
	description="Oppdater navn{canEditRole ? ' og rolle' : ''}."
>
	<div class="flex flex-col gap-5">
		<Field.Field data-invalid={nameError ? 'true' : undefined}>
			<Field.Label for="eu-name">Navn<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="eu-name"
				name="eu-name"
				bind:value={name}
				aria-invalid={Boolean(nameError)}
				oninput={() => (nameError = '')}
			/>
			{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="eu-email">E-post</Field.Label>
			<div
				class="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
			>
				{user?.email || '—'}
			</div>
			<Field.Description>E-postadressen administreres av NP.</Field.Description>
		</Field.Field>

		{#if canEditRole}
			<Field.Field>
				<Field.Label for="eu-role">Rolle</Field.Label>
				<Select.Root type="single" bind:value={role}>
					<Select.Trigger id="eu-role" class="w-full">{roleLabel(role)}</Select.Trigger>
					<Select.Content>
						<Select.Item value={UsersRoleOptions.owner} label="Eier">Eier</Select.Item>
						<Select.Item value={UsersRoleOptions.staff} label="Ansatt">Ansatt</Select.Item>
					</Select.Content>
				</Select.Root>
				<Field.Description>Eier kan endre alt. Ansatte ser booking, henvendelser og kunder.</Field.Description>
			</Field.Field>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
