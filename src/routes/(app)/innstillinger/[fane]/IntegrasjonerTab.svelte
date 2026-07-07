<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Wallet from '@lucide/svelte/icons/wallet';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Globe from '@lucide/svelte/icons/globe';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Mail from '@lucide/svelte/icons/mail';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import { relativeTime } from '$lib/utils/format';
	import {
		IntegrationStatusProviderOptions as Provider,
		type IntegrationStatusResponse,
		type IntegrationStatusProviderOptions,
		type IntegrationStatusStatusOptions
	} from '$lib/pocketbase-types';

	let { integrations }: { integrations: IntegrationStatusResponse[] } = $props();

	type IconComponent = typeof Wallet;
	type ProviderMeta = {
		provider: IntegrationStatusProviderOptions;
		name: string;
		description: string;
		icon: IconComponent;
	};

	// Canonical provider list, rendered in a stable order regardless of which
	// integration_status rows exist. A provider with no row reads «Ikke tilkoblet».
	const PROVIDERS: ProviderMeta[] = [
		{ provider: Provider.vipps, name: 'Vipps', description: 'Betaling og depositum ved booking', icon: Wallet },
		{ provider: Provider.stripe, name: 'Stripe', description: 'Kortbetaling på nett', icon: CreditCard },
		{ provider: Provider.google, name: 'Google', description: 'Business-profil og anmeldelser', icon: Globe },
		{ provider: Provider.meta, name: 'Meta', description: 'Facebook, Instagram og annonser', icon: Megaphone },
		{ provider: Provider.sms, name: 'SMS-utsending', description: 'Påminnelser og SMS-kampanjer', icon: Smartphone },
		{ provider: Provider.email, name: 'E-postutsending', description: 'Nyhetsbrev og kampanjer', icon: Mail }
	];

	// Provider → its status row (if any).
	const byProvider = $derived(new Map(integrations.map((i) => [i.provider, i])));

	type Card = ProviderMeta & {
		status: IntegrationStatusStatusOptions;
		updated: string | null;
	};

	const cards = $derived<Card[]>(
		PROVIDERS.map((p) => {
			const row = byProvider.get(p.provider);
			return { ...p, status: row?.status ?? 'not_connected', updated: row?.updated ?? null };
		})
	);

	// Honest actions: the customer never triggers a real OAuth/connection — NP sets
	// integrations up server-side. The button opens a toast that says exactly that,
	// rather than faking a connect flow.
	function act(card: Card) {
		if (card.status === 'not_connected') {
			toast.info(`Ta kontakt med NP, så kobler vi til ${card.name} for deg.`);
		} else {
			toast.info(`${card.name} administreres av NP. Ta kontakt om du vil endre oppsettet.`);
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="grid gap-4 sm:grid-cols-2">
		{#each cards as card (card.provider)}
			{@const Icon = card.icon}
			<section class="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
				<div class="flex items-center gap-3">
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
					>
						<Icon class="size-5" />
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-foreground">{card.name}</p>
						<p class="truncate text-xs text-muted-foreground">{card.description}</p>
					</div>
					<StatusBadge collection="integrations" status={card.status} />
				</div>

				<div class="flex items-center justify-between gap-3">
					{#if card.status === 'not_connected'}
						<Button variant="outline" size="sm" onclick={() => act(card)}>Koble til</Button>
					{:else}
						<Button variant="ghost" size="sm" class="-ml-2" onclick={() => act(card)}>
							Administrer
						</Button>
					{/if}
					{#if card.updated}
						<span class="shrink-0 text-xs text-muted-foreground">
							Oppdatert {relativeTime(card.updated)}
						</span>
					{/if}
				</div>
			</section>
		{/each}
	</div>

	<p class="text-xs text-muted-foreground">
		Tilkoblingene settes opp sammen med byrået. Nøkler og tilganger håndteres sikkert.
	</p>
</div>
