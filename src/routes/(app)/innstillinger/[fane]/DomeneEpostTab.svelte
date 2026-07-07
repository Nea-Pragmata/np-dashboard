<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Globe from '@lucide/svelte/icons/globe';
	import Mail from '@lucide/svelte/icons/mail';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button';
	import type { SettingsBusiness } from './+page';

	let { business }: { business: SettingsBusiness } = $props();

	// The schema has no dedicated domain field yet, so the domain shown is derived
	// from the contact e-post host (honest placeholder). Everything here is
	// agency-managed and read-only for the customer — no fake DNS/SSL actions.
	const email = $derived(business.contact_email?.trim() ?? '');
	const domain = $derived(email.includes('@') ? email.split('@')[1].toLowerCase() : '');

	function requestChange() {
		toast.info('Ta kontakt med NP, så hjelper vi deg med domene og e-post.');
	}

	const cardClass = 'flex flex-col gap-4 rounded-xl border border-border bg-card p-6';
	const cardTitle = 'text-base font-semibold text-foreground';
	const rowLabel = 'text-sm text-text-body';
	const npChip =
		'inline-flex h-[22px] shrink-0 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground';
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<!-- Domene -->
	<section class={cardClass}>
		<div class="flex items-center justify-between gap-3">
			<h2 class={cardTitle}>Domene</h2>
			<span class={npChip}>Styres av NP</span>
		</div>

		<div class="flex items-center justify-between gap-3">
			<div class="flex min-w-0 items-center gap-2">
				<Globe class="size-4 shrink-0 text-muted-foreground" />
				{#if domain}
					<span class="truncate text-sm font-medium text-foreground">{domain}</span>
				{:else}
					<span class="truncate text-sm text-muted-foreground">Ikke satt opp ennå</span>
				{/if}
			</div>
		</div>

		<div class="h-px w-full bg-border"></div>

		<div class="flex h-8 items-center justify-between gap-3">
			<span class={rowLabel}>SSL-sertifikat</span>
			<span class={npChip}>Styres av NP</span>
		</div>
		<div class="flex h-8 items-center justify-between gap-3">
			<span class={rowLabel}>DNS-oppsett</span>
			<span class={npChip}>Styres av NP</span>
		</div>

		<p class="text-xs text-muted-foreground">
			Domenet og DNS-oppsettet administreres av NP. Ta kontakt om du vil bytte domene.
		</p>
	</section>

	<!-- E-postadresser -->
	<section class={cardClass}>
		<h2 class={cardTitle}>E-postadresser</h2>

		{#if email}
			<div class="flex h-10 items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2">
					<Mail class="size-4 shrink-0 text-muted-foreground" />
					<span class="truncate text-sm font-medium text-foreground">{email}</span>
				</div>
				<span class="text-xs text-muted-foreground">Kontakt-e-post</span>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Ingen e-postadresse er satt opp ennå.</p>
		{/if}

		<div class="h-px w-full bg-border"></div>

		<div>
			<Button variant="outline" size="sm" onclick={requestChange}>
				<Plus class="size-4" />
				Be om ny adresse
			</Button>
		</div>
		<p class="text-xs text-muted-foreground">
			Nye adresser settes opp av NP innen én virkedag.
		</p>
	</section>
</div>
