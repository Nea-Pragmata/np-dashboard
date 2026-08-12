<script lang="ts">
	import { consent } from '$lib/stores/consent.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<!--
	Analytics-consent banner. Shows only while the choice is undecided ('pending').
	The baseline (cookieless, nothing stored on the device) already runs; this asks
	to opt IN to the enhanced tier (localStorage + account-linked analytics), so
	'Godta' and 'Fortsett uten' are equally weighted — the decline is not a dark
	pattern and both are one click in the same layer (Datatilsynet requirement).
-->
{#if consent.status === 'pending'}
	<div
		class="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
		role="region"
		aria-label="Samtykke til analyse"
	>
		<div
			class="mx-auto flex max-w-3xl flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="space-y-1">
				<p class="text-sm font-medium">Vi måler bruk for å forbedre tjenesten</p>
				<p class="text-sm text-muted-foreground">
					Uten samtykke samler vi bare enkel bruksstatistikk som ikke lagres på enheten din og
					ikke knyttes til navnet ditt. Godtar du, lagrer vi litt analysedata i nettleseren og
					kobler bruken til kontoen din for bedre innsikt. Du kan endre valget når som helst.
					<a
						href="/personvern"
						class="font-medium text-foreground underline underline-offset-4"
						>Les mer i personvernerklæringen</a
					>.
				</p>
			</div>
			<div class="flex shrink-0 gap-2">
				<Button variant="outline" onclick={() => consent.decline()}>Fortsett uten</Button>
				<Button variant="outline" onclick={() => consent.accept()}>Godta</Button>
			</div>
		</div>
	</div>
{/if}
