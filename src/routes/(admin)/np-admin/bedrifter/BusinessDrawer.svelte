<script lang="ts" module>
	import type { Component } from 'svelte';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Package from '@lucide/svelte/icons/package';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Users from '@lucide/svelte/icons/users';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Link from '@lucide/svelte/icons/link';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Target from '@lucide/svelte/icons/target';
	import Star from '@lucide/svelte/icons/star';
	import Clock from '@lucide/svelte/icons/clock';
	import { MODULE_KEYS, MODULE_LABELS, type ModuleKey } from '$lib/utils/modules';

	type IconComponent = Component<{ class?: string }>;

	// Icon per operational module key, in MODULE_KEYS order (labels come from modules.ts).
	const MODULE_ICONS: Record<ModuleKey, IconComponent> = {
		booking: CalendarDays,
		catalog: Package,
		inquiries: Inbox,
		customers: Users,
		campaigns: Megaphone,
		links: Link,
		social: Share2,
		ads: Target,
		reviews: Star,
		waitlist: Clock
	};

	export const MODULE_META = MODULE_KEYS.map((key) => ({
		key,
		label: MODULE_LABELS[key],
		icon: MODULE_ICONS[key]
	}));
</script>

<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import Drawer from '$lib/components/shared/Drawer.svelte';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';
	import { toast } from 'svelte-sonner';
	import { pb } from '$lib/pb';
	import { Collections, BusinessesStatusOptions } from '$lib/pocketbase-types';
	import { pbError } from '$lib/utils/errors';
	import type { BusinessRow, OverviewRow } from './+page';
	import { bransjeLabel } from './labels';

	let {
		open = $bindable(false),
		business = null,
		overview = null,
		onsaved
	}: {
		open?: boolean;
		/** The business being viewed/edited. */
		business?: BusinessRow | null;
		/** Matching overview row (package name / module count), for the summary. */
		overview?: OverviewRow | null;
		/** Called after a successful save so the parent can invalidate. */
		onsaved?: () => void;
	} = $props();

	const STATUS_OPTIONS = [
		{ value: BusinessesStatusOptions.active, label: 'Aktiv' },
		{ value: BusinessesStatusOptions.onboarding, label: 'Onboarding' },
		{ value: BusinessesStatusOptions.paused, label: 'Pauset' }
	];
	const statusLabel = $derived(STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Aktiv');

	// A draft has no owner user and no subscription yet, so it must not be flipped
	// live from here — «Aktiv» is dropped and activation goes through the prefilled
	// onboarding screen, which creates both in one transaction.
	const isDraft = $derived(business?.status === BusinessesStatusOptions.onboarding);
	const statusOptions = $derived(
		isDraft
			? STATUS_OPTIONS.filter((s) => s.value !== BusinessesStatusOptions.active)
			: STATUS_OPTIONS
	);

	// --- working copy --------------------------------------------------------
	// Seed every module key up front so the Switch `bind:checked` always has a
	// boolean lvalue — an empty {} would bind `undefined` and abort mounting.
	let modules = $state<Record<string, boolean>>(
		Object.fromEntries(MODULE_KEYS.map((k) => [k, false]))
	);
	let status = $state<string>(BusinessesStatusOptions.active);
	let saving = $state(false);

	// Re-seed the editor each time the drawer opens for a different business, so
	// an in-progress toggle is never clobbered by a re-render.
	let lastKey = '';
	$effect(() => {
		if (!open || !business) {
			lastKey = '';
			return;
		}
		if (business.id === lastKey) return;
		lastKey = business.id;

		const src = business.modules ?? {};
		const next: Record<string, boolean> = {};
		for (const key of MODULE_KEYS) next[key] = src[key] === true;
		modules = next;
		status = business.status;
	});

	const enabledCount = $derived(MODULE_KEYS.filter((k) => modules[k]).length);

	async function save() {
		if (!business) return;
		saving = true;
		try {
			// Agency write (businesses.update BY-branch): modules + status are
			// agency-only fields (a customer owner is blocked from setting them).
			await pb.collection(Collections.Businesses).update(business.id, {
				modules: { ...modules },
				status
			});
			toast.success('Endringene er lagret.');
			open = false;
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			saving = false;
		}
	}

	const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
	const dtClass = 'text-xs text-muted-foreground';
	const ddClass = 'text-sm text-foreground';
</script>

<Drawer
	bind:open
	title={business?.name ?? 'Bedrift'}
	description={business
		? `${bransjeLabel(business.type)}${overview?.package_name ? ` · ${overview.package_name}` : ''}`
		: undefined}
>
	{#if business}
		<div class="flex flex-col gap-6">
			<!-- Profilsammendrag -->
			<section class="flex flex-col gap-3">
				<p class={sectionLabel}>Bedriftsprofil</p>
				<dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Organisasjonsnummer</dt>
						<dd class={ddClass}>{business.org_number || '—'}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Nettadresse</dt>
						<dd class={ddClass}>/{business.slug}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>E-post</dt>
						<dd class="truncate {ddClass}">{business.contact_email || '—'}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class={dtClass}>Telefon</dt>
						<dd class={ddClass}>{business.phone || '—'}</dd>
					</div>
					<div class="flex flex-col gap-0.5 sm:col-span-2">
						<dt class={dtClass}>Adresse</dt>
						<dd class={ddClass}>{business.address || '—'}</dd>
					</div>
				</dl>
			</section>

			<!-- Status -->
			<section class="flex flex-col gap-2 border-t border-border pt-5">
				<p class={sectionLabel}>Status</p>
				<div class="flex items-center gap-3">
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger class="w-[220px]">{statusLabel}</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<StatusBadge collection="businesses" {status} />
				</div>
				{#if isDraft}
					<p class="text-sm text-muted-foreground">
						Utkastet mangler eier og abonnement. Fullfør onboarding for å aktivere bedriften.
					</p>
					<Button
						variant="outline"
						href="/np-admin/onboarding?bedrift={business.id}"
						class="mt-1 self-start"
					>
						Fullfør onboarding
					</Button>
				{/if}
			</section>

			<!-- Modulstyring -->
			<section class="flex flex-col gap-3 border-t border-border pt-5">
				<div class="flex items-baseline justify-between gap-2">
					<p class={sectionLabel}>Moduler</p>
					<span class="text-xs text-muted-foreground">{enabledCount} av {MODULE_KEYS.length} på</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Modulene styrer hvilke sider bedriften ser i menyen. Manuell overstyring — endres
					vanligvis via pakken i onboarding.
				</p>
				<div class="flex flex-col divide-y divide-border rounded-lg border border-border">
					{#each MODULE_META as m (m.key)}
						<label
							class="flex cursor-pointer items-center gap-3 px-3 py-2.5"
							for="mod-{m.key}"
						>
							<m.icon class="size-4 shrink-0 text-text-subtle" />
							<span class="min-w-0 flex-1 text-sm text-foreground">{m.label}</span>
							<Switch id="mod-{m.key}" bind:checked={modules[m.key]} />
						</label>
					{/each}
				</div>
			</section>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)} disabled={saving}>Avbryt</Button>
		<Button onclick={save} disabled={saving || !business}>
			{saving ? 'Lagrer …' : 'Lagre endringer'}
		</Button>
	{/snippet}
</Drawer>
