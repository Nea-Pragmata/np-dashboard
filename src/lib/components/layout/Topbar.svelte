<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Bell from '@lucide/svelte/icons/bell';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LogOut from '@lucide/svelte/icons/log-out';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { initials } from '$lib/utils/format';

	let { title = '' }: { title?: string } = $props();

	const userInitials = $derived(initials(auth.user?.name ?? auth.user?.email ?? ''));

	function logout() {
		auth.logout();
		goto('/logg-inn');
	}
</script>

<header
	class="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6"
>
	<p class="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{title}</p>

	<!--
		Search affordance — not wired to anything yet, so it is disabled and the ⌘K
		hint is gone (nothing listens for that shortcut). Kept in place so the
		layout matches Figma until the palette is built.
	-->
	<button
		type="button"
		aria-label="Søk"
		title="Søk kommer senere"
		disabled
		class="hidden h-9 w-[260px] items-center gap-2 rounded-sm border border-border bg-card pl-3 pr-1.5 text-left text-muted-foreground transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 sm:flex"
	>
		<Search class="size-4 shrink-0" />
		<span class="flex-1 truncate text-sm">Søk …</span>
	</button>

	<!--
		Notifications. There is no notifications collection yet, so this has nothing
		to open and nothing to count — disabled rather than dead, and without an
		unread dot (the previous one was hardcoded, so it announced unread items
		that never existed).
	-->
	<button
		type="button"
		aria-label="Varsler"
		title="Varsler kommer senere"
		disabled
		class="relative flex size-9 shrink-0 items-center justify-center rounded-sm text-text-body transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
	>
		<Bell class="size-[18px]" />
	</button>

	<!-- User menu -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="flex shrink-0 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Brukermeny"
		>
			<span
				class="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-text-body"
			>
				{userInitials}
			</span>
			<ChevronDown class="size-4 text-muted-foreground" />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-56" align="end">
			<DropdownMenu.Label class="flex flex-col gap-0.5">
				<span class="truncate text-sm font-medium text-foreground">{auth.user?.name}</span>
				<span class="truncate text-xs font-normal text-muted-foreground">{auth.user?.email}</span>
			</DropdownMenu.Label>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={logout}>
				<LogOut class="size-4" />
				Logg ut
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</header>
