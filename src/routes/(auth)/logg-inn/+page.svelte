<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;
		loading = true;
		try {
			await auth.login(email.trim(), password);
			await goto('/oversikt');
		} catch (error) {
			const message = pbError(error);
			if (message) toast.error(message);
		} finally {
			loading = false;
		}
	}

	function forgotPassword() {
		toast.info('Ta kontakt med byrået, så hjelper vi deg med å tilbakestille passordet.');
	}
</script>

<svelte:head><title>Logg inn · NP Dashboard</title></svelte:head>

<div class="flex min-h-svh items-center justify-center bg-background px-4 py-10">
	<div class="flex w-full max-w-[400px] flex-col gap-6">
		<!-- Brand -->
		<div class="flex items-center justify-center gap-2.5">
			<span
				class="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
			>
				N
			</span>
			<span class="text-base font-semibold text-foreground">NP Dashboard</span>
		</div>

		<!-- Card -->
		<div class="rounded-lg border border-border bg-card p-8">
			<div class="mb-6 flex flex-col gap-1">
				<h1 class="text-xl font-semibold text-foreground">Logg inn</h1>
				<p class="text-sm text-muted-foreground">
					Velkommen tilbake. Skriv inn e-post og passord.
				</p>
			</div>

			<form onsubmit={submit} novalidate>
				<Field.FieldGroup>
					<Field.Field>
						<Field.FieldLabel for="email">E-post</Field.FieldLabel>
						<Input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							placeholder="deg@bedrift.no"
							bind:value={email}
							disabled={loading}
							required
							class="h-9"
						/>
					</Field.Field>

					<Field.Field>
						<Field.FieldLabel for="password">Passord</Field.FieldLabel>
						<Input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							bind:value={password}
							disabled={loading}
							required
							class="h-9"
						/>
						<button
							type="button"
							onclick={forgotPassword}
							class="self-end rounded text-xs font-medium text-accent-blue-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Glemt passord?
						</button>
					</Field.Field>

					<Button type="submit" size="lg" class="w-full" disabled={loading}>
						{loading ? 'Logger inn …' : 'Logg inn'}
					</Button>
				</Field.FieldGroup>
			</form>

			<Separator class="my-4" />

			<p class="text-center text-xs text-muted-foreground">
				Har du ikke tilgang? Ta kontakt med byrået, så hjelper vi deg.
			</p>
		</div>

		<p class="text-center text-xs text-text-subtle">NP Dashboard · Levert av byrået ditt</p>
	</div>
</div>
