<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import { pb } from '$lib/pb';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import { slugify, formatKr } from '$lib/utils/format';
	import { Collections } from '$lib/pocketbase-types';
	import { NAV, filterNav, MODULE_KEYS, type ModuleKey } from '$lib/utils/modules';
	import {
		BUSINESS_TYPE_OPTIONS,
		MODULE_LABELS,
		emptyModules,
		modulesFromPackage,
		generateRecordId,
		generatePassword
	} from './onboarding';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Only a byråeier may create businesses + subscriptions (both are BE-gated in
	// the API rules — a byråansatt is blocked server-side). Gate the whole flow.
	const isOwner = $derived(auth.agencyMember?.role === 'owner');

	// --- form state ----------------------------------------------------------
	let name = $state('');
	let type = $state<string>(BUSINESS_TYPE_OPTIONS[0].value);
	let contactName = $state('');
	let email = $state('');
	let phone = $state('');
	let packageId = $state('');
	let modules = $state<Record<ModuleKey, boolean>>(emptyModules());
	let addonIds = $state<string[]>([]);
	let saving = $state(false);

	const slug = $derived(slugify(name));

	const typeLabel = $derived(
		BUSINESS_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? 'Velg bransje'
	);
	const selectedPackage = $derived(data.packages.find((p) => p.id === packageId) ?? null);
	const packageLabel = $derived(selectedPackage?.name ?? 'Velg pakke');

	// When the chosen package changes, refill the module checkboxes from its
	// default_modules — but only on an actual change, so manual toggles survive
	// re-renders (mirrors the BusinessDrawer «lastKey» pattern).
	let lastPackageId = '';
	$effect(() => {
		if (packageId === lastPackageId) return;
		lastPackageId = packageId;
		modules = selectedPackage
			? modulesFromPackage(selectedPackage.default_modules)
			: emptyModules();
	});

	function toggleAddon(id: string, on: boolean) {
		addonIds = on ? [...addonIds, id] : addonIds.filter((a) => a !== id);
	}

	// --- «Slik blir menyen» preview -----------------------------------------
	const previewNav = $derived(filterNav(modules));
	const hiddenNav = $derived(
		NAV.filter((n) => !previewNav.some((p) => p.href === n.href))
	);
	const hiddenLabels = $derived(hiddenNav.map((n) => n.label).join(', '));

	// --- submit --------------------------------------------------------------
	const trimmedName = $derived(name.trim());
	const canCreate = $derived(
		Boolean(
			trimmedName &&
				contactName.trim() &&
				email.trim().includes('@') &&
				packageId &&
				!saving
		)
	);
	const canDraft = $derived(Boolean(trimmedName && !saving));

	async function createBusiness(mode: 'full' | 'draft') {
		if (saving) return;
		if (mode === 'full' && !canCreate) return;
		if (mode === 'draft' && !canDraft) return;
		saving = true;
		try {
			const bizId = generateRecordId();
			const moduleRecord = { ...modules };

			if (mode === 'draft') {
				// A draft is the business record only (status onboarding, no owner,
				// no subscription) — the agency finishes setup later.
				await pb.collection(Collections.Businesses).create({
					id: bizId,
					name: trimmedName,
					slug,
					type,
					status: 'onboarding',
					contact_email: email.trim(),
					phone: phone.trim(),
					modules: moduleRecord
				});
				toast.success('Lagret som utkast.');
				await goto('/np-admin/bedrifter');
				return;
			}

			// Full onboarding: business + owner user + subscription in one atomic
			// batch (a client-provided business id links all three). This is the
			// deferred subscription→modules sync, done here in the UI.
			const password = generatePassword();
			const batch = pb.createBatch();
			batch.collection(Collections.Businesses).create({
				id: bizId,
				name: trimmedName,
				slug,
				type,
				status: 'active',
				contact_email: email.trim(),
				phone: phone.trim(),
				modules: moduleRecord
			});
			batch.collection(Collections.Users).create({
				email: email.trim(),
				name: contactName.trim(),
				role: 'owner',
				status: 'invited',
				business: bizId,
				emailVisibility: true,
				password,
				passwordConfirm: password
			});
			batch.collection(Collections.Subscriptions).create({
				business: bizId,
				package: packageId,
				addons: addonIds,
				start_date: new Date().toISOString(),
				status: 'active'
			});
			await batch.send();

			toast.success(`${trimmedName} er opprettet.`);
			await goto('/np-admin/bedrifter');
		} catch (e) {
			// The batch is transactional — a failure leaves no orphan records.
			toast.error(pbError(e) || 'Kunne ikke opprette bedriften.');
		} finally {
			saving = false;
		}
	}

	const cardClass = 'flex flex-col gap-5 rounded-xl border border-border bg-card p-6';
	const sectionTitle = 'text-base font-semibold text-foreground';
	const enabledCount = $derived(MODULE_KEYS.filter((k) => modules[k]).length);
</script>

<svelte:head><title>Onboarding · NP Admin</title></svelte:head>

<div class="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
	<!-- Header -->
	<header class="min-w-0">
		<h1 class="text-2xl font-semibold text-foreground">Onboarding</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Opprett en ny kunde og velg modulene de skal ha.
		</p>
	</header>

	{#if !isOwner}
		<div class="rounded-xl border border-border bg-card">
			<EmptyState
				icon={ShieldAlert}
				title="Kun byråeier kan opprette bedrifter"
				description="Onboarding oppretter bedrift, eier og abonnement. Be en byråeier om å fullføre dette."
				class="py-12"
			/>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left: the form (2/3) -->
			<div class="flex flex-col gap-6 lg:col-span-2">
				<!-- Om kunden -->
				<section class={cardClass}>
					<h2 class={sectionTitle}>Om kunden</h2>

					<div class="flex flex-col gap-1.5">
						<Label for="ob-name">Bedriftsnavn</Label>
						<Input id="ob-name" name="ob-name" bind:value={name} placeholder="Salong Vakker" />
						{#if slug}
							<p class="text-xs text-muted-foreground">Nettadresse: /{slug}</p>
						{/if}
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="ob-type">Bransje</Label>
						<Select.Root type="single" bind:value={type}>
							<Select.Trigger id="ob-type" class="w-full">{typeLabel}</Select.Trigger>
							<Select.Content>
								{#each BUSINESS_TYPE_OPTIONS as opt (opt.value)}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="ob-contact">Kontaktperson</Label>
						<Input
							id="ob-contact"
							name="ob-contact"
							bind:value={contactName}
							placeholder="Lise Vang"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="ob-email">E-post</Label>
						<Input
							id="ob-email"
							name="ob-email"
							type="email"
							bind:value={email}
							placeholder="lise@salongvakker.no"
						/>
						<p class="text-xs text-muted-foreground">Blir innlogget eier for kunden.</p>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="ob-phone">Telefon</Label>
						<Input id="ob-phone" name="ob-phone" bind:value={phone} placeholder="934 55 210" />
					</div>
				</section>

				<!-- Pakke og moduler -->
				<section class={cardClass}>
					<h2 class={sectionTitle}>Pakke og moduler</h2>

					<div class="flex flex-col gap-1.5">
						<Label for="ob-package">Pakke</Label>
						<Select.Root type="single" bind:value={packageId}>
							<Select.Trigger id="ob-package" class="w-full">{packageLabel}</Select.Trigger>
							<Select.Content>
								{#each data.packages as p (p.id)}
									<Select.Item value={p.id} label={p.name}>
										{p.name} · {formatKr(p.price_per_month)}/mnd
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<p class="text-xs text-muted-foreground">
							Pakken velger standardmoduler — juster under.
						</p>
					</div>

					<div class="flex flex-col gap-0.5">
						<div class="flex items-baseline justify-between pb-1">
							<span class="text-xs font-medium text-muted-foreground">Moduler</span>
							<span class="text-xs text-muted-foreground">{enabledCount} på</span>
						</div>
						{#each MODULE_KEYS as key (key)}
							<label
								for="ob-mod-{key}"
								class="flex cursor-pointer items-center gap-3 py-2"
							>
								<Checkbox id="ob-mod-{key}" bind:checked={modules[key]} />
								<span class="text-sm text-foreground">{MODULE_LABELS[key]}</span>
							</label>
						{/each}
					</div>

					{#if data.addons.length > 0}
						<div class="flex flex-col gap-0.5 border-t border-border pt-4">
							<span class="pb-1 text-xs font-medium text-muted-foreground">Tilleggstjenester</span>
							{#each data.addons as addon (addon.id)}
								<label
									for="ob-addon-{addon.id}"
									class="flex cursor-pointer items-center gap-3 py-2"
								>
									<Checkbox
										id="ob-addon-{addon.id}"
										checked={addonIds.includes(addon.id)}
										onCheckedChange={(v) => toggleAddon(addon.id, v === true)}
									/>
									<span class="min-w-0 flex-1 text-sm text-foreground">{addon.name}</span>
									<span class="shrink-0 text-xs text-muted-foreground">
										{formatKr(addon.price)}{addon.price_type === 'monthly' ? '/mnd' : ''}
									</span>
								</label>
							{/each}
						</div>
					{/if}
				</section>
			</div>

			<!-- Right: menu preview (1/3) -->
			<aside class="lg:col-span-1">
				<div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 lg:sticky lg:top-6">
					<div class="flex flex-col gap-1">
						<h2 class={sectionTitle}>Slik blir menyen</h2>
						<p class="text-sm text-muted-foreground">
							Menyen kunden ser, styres av modulvalgene.
						</p>
					</div>

					<ul class="flex flex-col gap-0.5">
						{#each previewNav as item, i (item.href)}
							<li
								class={[
									'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm',
									i === 0 ? 'bg-muted font-medium text-foreground' : 'text-text-body'
								]}
							>
								<item.icon class="size-4 shrink-0 text-text-subtle" />
								<span class="min-w-0 flex-1 truncate">{item.label}</span>
								{#if i === 0}
									<Check class="size-3.5 shrink-0 text-text-subtle" aria-hidden="true" />
								{/if}
							</li>
						{/each}
					</ul>

					{#if hiddenNav.length > 0}
						<p class="border-t border-border pt-3 text-xs text-muted-foreground">
							{hiddenLabels} vises ikke — modulene er slått av.
						</p>
					{:else}
						<p class="border-t border-border pt-3 text-xs text-muted-foreground">
							Alle sider er slått på.
						</p>
					{/if}
				</div>
			</aside>
		</div>

		<!-- Footer actions: one black primary («maks én svart primærknapp») -->
		<div class="flex flex-wrap items-center justify-end gap-3">
			<Button variant="outline" onclick={() => createBusiness('draft')} disabled={!canDraft}>
				Lagre som utkast
			</Button>
			<Button onclick={() => createBusiness('full')} disabled={!canCreate}>
				{saving ? 'Oppretter …' : 'Opprett bedrift'}
			</Button>
		</div>
	{/if}
</div>
