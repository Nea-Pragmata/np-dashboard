<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Package from '@lucide/svelte/icons/package';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Users from '@lucide/svelte/icons/users';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Star from '@lucide/svelte/icons/star';
	import Zap from '@lucide/svelte/icons/zap';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Clock from '@lucide/svelte/icons/clock';
	import { Button } from '$lib/components/ui/button';
	import { formatKr } from '$lib/utils/format';
	import {
		MODULE_KEYS,
		NAV_GROUPS,
		filterNav,
		type BusinessModules,
		type ModuleKey
	} from '$lib/utils/modules';
	import type { SettingsSubscription } from './+page';

	let {
		subscription,
		modules
	}: {
		subscription: SettingsSubscription | null;
		modules: BusinessModules;
	} = $props();

	type IconComponent = typeof CalendarDays;

	// Human label + icon for every businesses.modules key. Order follows the design
	// module list; «Lenkeside» + «Sosiale medier» are appended so the on/off list
	// stays complete (the data model has 10 keys, the design frame draws 8).
	const MODULE_META: { key: ModuleKey; label: string; icon: IconComponent }[] = [
		{ key: 'booking', label: 'Booking', icon: CalendarDays },
		{ key: 'catalog', label: 'Katalog', icon: Package },
		{ key: 'inquiries', label: 'Henvendelser', icon: Inbox },
		{ key: 'customers', label: 'Kunder & lojalitet', icon: Users },
		{ key: 'campaigns', label: 'Kampanjer', icon: Megaphone },
		{ key: 'reviews', label: 'Anmeldelser', icon: Star },
		{ key: 'ads', label: 'Annonser', icon: Zap },
		{ key: 'links', label: 'Lenkeside', icon: Link2 },
		{ key: 'social', label: 'Sosiale medier', icon: Share2 },
		{ key: 'waitlist', label: 'Venteliste', icon: Clock }
	];

	const activeCount = $derived(MODULE_KEYS.filter((k) => Boolean(modules?.[k])).length);

	// --- Menu preview («Slik blir menyen») — mirrors (app)/+layout.svelte -----
	const navItems = $derived(filterNav(modules));
	const overview = $derived(navItems.find((i) => i.href === '/oversikt'));
	const settingsItem = $derived(navItems.find((i) => i.href === '/innstillinger'));
	const previewGroups = $derived(
		NAV_GROUPS.map((group) => ({
			label: group,
			items: navItems.filter(
				(i) => i.group === group && i.href !== '/oversikt' && i.href !== '/innstillinger'
			)
		})).filter((g) => g.items.length > 0)
	);

	// --- Subscription + computed price ---------------------------------------
	const pkg = $derived(subscription?.expand?.package ?? null);
	const addons = $derived(subscription?.expand?.addons ?? []);
	const campaign = $derived(subscription?.expand?.campaign ?? null);

	const monthlyAddons = $derived(addons.filter((a) => a.price_type === 'monthly'));
	const oneTimeAddons = $derived(addons.filter((a) => a.price_type === 'one_time'));

	// Base monthly price: an explicit per-subscription override wins over the
	// package list price when set.
	const base = $derived(
		subscription?.price_override && subscription.price_override > 0
			? subscription.price_override
			: (pkg?.price_per_month ?? 0)
	);
	const monthlyAddonSum = $derived(monthlyAddons.reduce((s, a) => s + a.price, 0));
	const subtotal = $derived(base + monthlyAddonSum);
	// Only percentage campaigns reduce the recurring price. «amount» campaigns are
	// one-time credits (e.g. a waived setup fee) and are shown separately — never
	// subtracted from a monthly figure.
	const percentDiscount = $derived(
		campaign?.discount_type === 'percent'
			? Math.round((subtotal * campaign.discount_value) / 100)
			: 0
	);
	const monthlyTotal = $derived(Math.max(0, subtotal - percentDiscount));
	const amountCampaign = $derived(campaign?.discount_type === 'amount' ? campaign : null);

	const highlights = $derived((pkg?.highlights as string[] | null) ?? []);
	// package.description is a small HTMLString ("<p>…</p>") — render as plain text.
	const description = $derived(
		(pkg?.description ?? '')
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);

	function requestChange() {
		toast.info('Ta kontakt med NP, så hjelper vi deg med endringer i pakken.');
	}
	function contactAgency() {
		toast.info('Ta kontakt med NP, så setter vi det opp for deg.');
	}

	const cardClass = 'flex flex-col gap-4 rounded-xl border border-border bg-card p-6';
	const cardTitle = 'text-base font-semibold text-foreground';
	const capsLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

{#snippet modulePill(active: boolean)}
	<span
		class={[
			'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium',
			active ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'
		]}
	>
		<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"></span>
		{active ? 'Aktiv' : 'Ikke aktiv'}
	</span>
{/snippet}

{#snippet navRow(Icon: IconComponent, label: string)}
	<div class="flex h-9 items-center gap-3 rounded-md px-3">
		<Icon class="size-[18px] shrink-0 text-muted-foreground" />
		<span class="min-w-0 flex-1 truncate text-sm text-text-body">{label}</span>
	</div>
{/snippet}

<div class="grid gap-6 lg:grid-cols-[1fr_384px]">
	<!-- Venstre: moduler + menyforhåndsvisning -->
	<div class="flex flex-col gap-6">
		<!-- Moduler (les-bare) -->
		<section class={cardClass}>
			<div class="flex flex-col gap-1">
				<h2 class={cardTitle}>Moduler</h2>
				<p class="text-xs text-muted-foreground">
					Modulene styrer hvilke sider du ser i menyen til venstre. {activeCount} av {MODULE_META.length}
					er aktive.
				</p>
			</div>

			<div class="flex flex-col">
				{#each MODULE_META as m, i (m.key)}
					{@const Icon = m.icon}
					<div
						class={[
							'flex h-12 items-center gap-3',
							i < MODULE_META.length - 1 && 'border-b border-border'
						]}
					>
						<Icon class="size-4 shrink-0 text-muted-foreground" />
						<span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{m.label}</span>
						{@render modulePill(Boolean(modules?.[m.key]))}
					</div>
				{/each}
			</div>

			<p class="text-xs text-muted-foreground">
				Modulene styres av byrået. Kontakt NP for å endre moduler.
			</p>
		</section>

		<!-- Slik blir menyen -->
		<section class={cardClass}>
			<div class="flex flex-col gap-1">
				<h2 class={cardTitle}>Slik blir menyen</h2>
				<p class="text-xs text-muted-foreground">
					Forhåndsvisning av menyen de aktive modulene gir deg.
				</p>
			</div>

			<div class="rounded-lg border border-border bg-muted/40 p-2">
				<nav class="flex flex-col gap-0.5" aria-label="Forhåndsvisning av meny">
					{#if overview}
						{@render navRow(overview.icon, overview.label)}
					{/if}
					{#each previewGroups as group (group.label)}
						<div
							class="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-text-subtle"
						>
							{group.label}
						</div>
						{#each group.items as item (item.href)}
							{@render navRow(item.icon, item.label)}
						{/each}
					{/each}
					<div class="my-2 h-px w-full bg-border"></div>
					{#if settingsItem}
						{@render navRow(settingsItem.icon, settingsItem.label)}
					{/if}
				</nav>
			</div>
		</section>
	</div>

	<!-- Høyre: pakke + pris + upsell -->
	<div class="flex flex-col gap-6">
		{#if pkg}
			<!-- Din pakke -->
			<section class={cardClass}>
				<div class="flex flex-col gap-1">
					<p class={capsLabel}>Pakke</p>
					<p class="text-lg font-semibold text-foreground">{pkg.name}</p>
				</div>

				{#if description}
					<p class="text-sm text-text-body">{description}</p>
				{/if}

				{#if highlights.length}
					<div class="h-px w-full bg-border"></div>
					<ul class="flex flex-col gap-2">
						{#each highlights as h (h)}
							<li class="flex items-center gap-2 text-xs text-text-body">
								<Check class="size-3.5 shrink-0 text-success" />
								<span class="min-w-0 flex-1">{h}</span>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="h-px w-full bg-border"></div>

				<!-- Månedspris (beregnet: pakke + faste tillegg − prosentkampanje) -->
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between gap-3 text-sm">
						<span class="min-w-0 truncate text-text-body">{pkg.name}</span>
						<span class="shrink-0 tabular-nums text-foreground">{formatKr(base)}</span>
					</div>
					{#each monthlyAddons as a (a.id)}
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="min-w-0 truncate text-text-body">{a.name}</span>
							<span class="shrink-0 tabular-nums text-foreground">+ {formatKr(a.price)}</span>
						</div>
					{/each}
					{#if percentDiscount > 0 && campaign}
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="min-w-0 truncate text-text-body">{campaign.name}</span>
							<span class="shrink-0 tabular-nums text-success">− {formatKr(percentDiscount)}</span>
						</div>
					{/if}
					{#if monthlyAddons.length === 0 && percentDiscount === 0}
						<p class="text-xs text-muted-foreground">Ingen faste tillegg.</p>
					{/if}
					<div class="h-px w-full bg-border"></div>
					<div class="flex items-baseline justify-between gap-3">
						<span class="text-sm font-medium text-foreground">Per måned</span>
						<span class="text-lg font-semibold tabular-nums text-foreground">
							{formatKr(monthlyTotal)}
						</span>
					</div>
				</div>

				{#if oneTimeAddons.length || amountCampaign}
					<div class="flex flex-col gap-1">
						{#each oneTimeAddons as a (a.id)}
							<p class="text-xs text-muted-foreground">Engang: {a.name} — {formatKr(a.price)}</p>
						{/each}
						{#if amountCampaign}
							<p class="text-xs text-muted-foreground">
								Engang: {amountCampaign.name} — −{formatKr(amountCampaign.discount_value)}
							</p>
						{/if}
					</div>
				{/if}

				<p class="text-xs text-muted-foreground">Faktureres av byrået månedlig.</p>

				<div>
					<Button variant="outline" size="sm" onclick={requestChange}>Be om endring i pakken</Button>
				</div>
			</section>

			<!-- Trenger du mer? -->
			<section class="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
				<h2 class={cardTitle}>Trenger du mer?</h2>
				<p class="text-sm text-text-body">
					Vil du prøve annonser eller venteliste? Ta kontakt, så setter vi det opp.
				</p>
				<div>
					<Button variant="ghost" size="sm" class="-ml-2" onclick={contactAgency}>
						Kontakt byrået
					</Button>
				</div>
			</section>
		{:else}
			<!-- Abonnement mangler — ærlig beskjed -->
			<section class={cardClass}>
				<div class="flex items-center gap-2">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning">
						<CircleAlert class="size-5" />
					</span>
					<h2 class={cardTitle}>Fant ikke abonnement</h2>
				</div>
				<p class="text-sm text-muted-foreground">
					Vi finner ikke et aktivt abonnement for bedriften ennå. Ta kontakt med NP, så hjelper vi
					deg.
				</p>
				<div>
					<Button variant="outline" size="sm" onclick={contactAgency}>Kontakt byrået</Button>
				</div>
			</section>
		{/if}
	</div>
</div>
