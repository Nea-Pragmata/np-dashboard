<script lang="ts">
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Check from '@lucide/svelte/icons/check';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { tenant } from '$lib/stores/tenant.svelte';
	import { invalidate } from '$app/navigation';
	import { initials, businessTypeLabel } from '$lib/utils/format';
	import type { BusinessesResponse } from '$lib/pocketbase-types';

	// Agency-only tenant picker. Selecting a business updates the persisted tenant
	// store and invalidates `app:tenant`, which re-runs the (app) layout load so
	// the whole shell (menu, badge, business context) re-resolves.
	let {
		businesses,
		current
	}: {
		businesses: BusinessesResponse[];
		current: BusinessesResponse | null;
	} = $props();

	async function select(id: string) {
		if (id === current?.id) return;
		tenant.set(id);
		await invalidate('app:tenant');
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
	>
		<span
			class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-text-body"
		>
			{initials(current?.name ?? '')}
		</span>
		<span class="min-w-0 flex-1">
			<span class="block truncate text-sm font-medium text-foreground">
				{current?.name ?? 'Velg bedrift'}
			</span>
			<span class="block truncate text-xs text-muted-foreground">
				{current ? businessTypeLabel(current.type) : 'Ingen bedrift valgt'}
			</span>
		</span>
		<ChevronsUpDown class="size-4 shrink-0 text-muted-foreground" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-[232px]" align="start">
		<DropdownMenu.Label>Bytt bedrift</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#each businesses as business (business.id)}
			<DropdownMenu.Item class="gap-2" onSelect={() => select(business.id)}>
				<span
					class="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-text-body"
				>
					{initials(business.name)}
				</span>
				<span class="min-w-0 flex-1 truncate">{business.name}</span>
				{#if business.id === current?.id}
					<Check class="size-4 shrink-0 text-foreground" />
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
