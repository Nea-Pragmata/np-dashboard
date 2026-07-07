<script lang="ts">
	import { ClientResponseError } from 'pocketbase';
	import { toast } from 'svelte-sonner';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Copy from '@lucide/svelte/icons/copy';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import { pb } from '$lib/pb';
	import { Collections, UsersRoleOptions, UsersStatusOptions } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';

	let {
		open = $bindable(false),
		businessId,
		onsaved
	}: {
		open?: boolean;
		businessId: string;
		onsaved?: () => void;
	} = $props();

	let name = $state('');
	let email = $state('');
	let tempPassword = $state('');
	let nameError = $state('');
	let emailError = $state('');
	let saving = $state(false);

	/** 14-char temp password (letters + digits), safe for the PB min-length rule. */
	function genPassword(): string {
		const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
		const bytes = new Uint32Array(14);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
	}

	// Reset the form each time the drawer opens with a fresh temp password.
	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) {
			name = '';
			email = '';
			nameError = '';
			emailError = '';
			tempPassword = genPassword();
		}
		wasOpen = open;
	});

	async function copyPassword() {
		try {
			await navigator.clipboard.writeText(tempPassword);
			toast.success('Passordet er kopiert.');
		} catch {
			toast.error('Fikk ikke kopiert passordet.');
		}
	}

	function inviteError(e: unknown): string {
		if (e instanceof ClientResponseError) {
			const data = e.response?.data as Record<string, { message?: string }> | undefined;
			if (data?.email) return 'E-postadressen er ugyldig eller allerede i bruk.';
			if (data?.password) return 'Passordet er for svakt. Lag et nytt og prøv igjen.';
			if (e.status === 403) return 'Du har ikke tilgang til å invitere brukere.';
		}
		return pbError(e);
	}

	async function invite() {
		nameError = name.trim() ? '' : 'Navn må fylles ut.';
		emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
			? ''
			: 'Skriv inn en gyldig e-postadresse.';
		if (nameError || emailError) return;

		saving = true;
		try {
			// Owner CREATE per API rule: role must be staff and business must be own.
			// A temp password is required (PocketBase auth create); the owner shares
			// it with the new user, who changes it on first sign-in.
			await pb.collection(Collections.Users).create({
				name: name.trim(),
				email: email.trim(),
				password: tempPassword,
				passwordConfirm: tempPassword,
				role: UsersRoleOptions.staff,
				business: businessId,
				status: UsersStatusOptions.invited,
				emailVisibility: true
			});
			toast.success('Brukeren er lagt til. Del det midlertidige passordet med hen.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(inviteError(e));
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title="Inviter bruker"
	description="Legg til en ansatt som skal ha tilgang til dashbordet."
>
	<div class="flex flex-col gap-5">
		<Field.Field data-invalid={nameError ? 'true' : undefined}>
			<Field.Label for="iu-name">Navn<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="iu-name"
				name="iu-name"
				bind:value={name}
				placeholder="F.eks. Kari Hansen"
				aria-invalid={Boolean(nameError)}
				oninput={() => (nameError = '')}
			/>
			{#if nameError}<Field.Error>{nameError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field data-invalid={emailError ? 'true' : undefined}>
			<Field.Label for="iu-email">E-post<span class="text-destructive"> *</span></Field.Label>
			<Input
				id="iu-email"
				name="iu-email"
				type="email"
				bind:value={email}
				placeholder="F.eks. kari@bedriften.no"
				aria-invalid={Boolean(emailError)}
				oninput={() => (emailError = '')}
			/>
			{#if emailError}<Field.Error>{emailError}</Field.Error>{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label>Rolle</Field.Label>
			<div
				class="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
			>
				Ansatt
			</div>
			<Field.Description>
				Nye brukere legges til som ansatt. Du kan endre rollen etterpå.
			</Field.Description>
		</Field.Field>

		<div class="flex flex-col gap-4 border-t border-border pt-4">
			<Field.Field>
				<Field.Label for="iu-pass">Midlertidig passord</Field.Label>
				<div class="flex items-center gap-2">
					<Input id="iu-pass" name="iu-pass" readonly value={tempPassword} class="font-mono" />
					<Button
						type="button"
						variant="outline"
						size="icon"
						onclick={copyPassword}
						aria-label="Kopier passord"
					>
						<Copy class="size-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onclick={() => (tempPassword = genPassword())}
						aria-label="Lag nytt passord"
					>
						<RefreshCw class="size-4" />
					</Button>
				</div>
				<Field.Description>
					Del passordet med brukeren. Hen bør endre det ved første innlogging.
					E-postinvitasjoner sendes ikke automatisk ennå.
				</Field.Description>
			</Field.Field>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={invite} disabled={saving}>
			{saving ? 'Legger til …' : 'Legg til bruker'}
		</Button>
	{/snippet}
</Drawer>
