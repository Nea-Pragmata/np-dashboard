<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Users from '@lucide/svelte/icons/users';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import EmptyState from '$lib/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte';
	import { pb } from '$lib/pb';
	import { Collections, type UsersResponse } from '$lib/pocketbase-types';
	import { auth } from '$lib/stores/auth.svelte';
	import { pbError } from '$lib/utils/errors';
	import { formatDate, initials, roleLabel } from '$lib/utils/format';
	import InviteUserDrawer from './InviteUserDrawer.svelte';
	import EditUserDrawer from './EditUserDrawer.svelte';

	let {
		users,
		businessId,
		isOwner,
		inviteOpen = $bindable(false),
		onsaved
	}: {
		users: UsersResponse[];
		businessId: string;
		isOwner: boolean;
		/** Bound to the page-header «Inviter bruker» primary. */
		inviteOpen?: boolean;
		onsaved?: () => void;
	} = $props();

	const currentUserId = $derived(auth.user?.id ?? '');

	// «Sist aktiv» at day granularity, matching the design wording.
	function lastActiveLabel(iso?: string): string {
		if (!iso) return '–';
		const then = new Date(iso);
		if (Number.isNaN(then.getTime())) return '–';
		const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const diffDays = Math.round((startOf(new Date()) - startOf(then)) / 86_400_000);
		if (diffDays <= 0) return 'I dag';
		if (diffDays === 1) return 'I går';
		if (diffDays < 7) return `For ${diffDays} dager siden`;
		return formatDate(then);
	}

	// Local status pill (StatusBadge has no `users` map and is a shared file).
	function statusPill(status: string): { label: string; cls: string } {
		if (status === 'invited') return { label: 'Invitert', cls: 'bg-warning-bg text-warning' };
		return { label: 'Aktiv', cls: 'bg-success-bg text-success' };
	}

	// --- edit / delete state -------------------------------------------------
	let editOpen = $state(false);
	let editingUser = $state<UsersResponse | null>(null);
	let editCanRole = $state(false);

	let confirmOpen = $state(false);
	let userToDelete = $state<UsersResponse | null>(null);

	function openEdit(u: UsersResponse, canRole: boolean) {
		editingUser = u;
		editCanRole = canRole;
		editOpen = true;
	}
	function askDelete(u: UsersResponse) {
		userToDelete = u;
		confirmOpen = true;
	}
	async function deleteUser() {
		const u = userToDelete;
		if (!u) return;
		try {
			await pb.collection(Collections.Users).delete(u.id);
			toast.success('Brukeren er fjernet.');
			onsaved?.();
		} catch (e) {
			toast.error(pbError(e));
		} finally {
			userToDelete = null;
		}
	}

	const triggerClass =
		'flex size-8 items-center justify-center rounded-md text-text-subtle outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
	const head = 'text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground';
</script>

<div class="flex flex-col gap-3">
	{#if users.length === 0}
		<div class="rounded-xl border border-border bg-card">
			<EmptyState
				icon={Users}
				title="Ingen brukere ennå"
				description="Inviter de ansatte som skal ha tilgang til dashbordet."
			/>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-border bg-card">
			<div class="min-w-[720px]">
				<!-- Header -->
				<div class="flex h-10 items-center gap-3 px-4">
					<div class="{head} min-w-0 flex-1">Bruker</div>
					<div class="{head} w-40 shrink-0">Rolle</div>
					<div class="{head} w-[150px] shrink-0">Sist aktiv</div>
					<div class="{head} w-[130px] shrink-0">Status</div>
					<div class="w-16 shrink-0"></div>
				</div>
				<div class="h-px w-full bg-border"></div>

				<!-- Rows -->
				{#each users as u, i (u.id)}
					{@const isSelf = u.id === currentUserId}
					{@const pill = statusPill(u.status)}
					{#if i > 0}<div class="h-px w-full bg-border"></div>{/if}
					<div class="flex h-14 items-center gap-3 px-4">
						<!-- Bruker -->
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<span
								class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-text-body"
								aria-hidden="true"
							>
								{initials(u.name || u.email)}
							</span>
							<div class="flex min-w-0 flex-col">
								<span class="truncate text-sm font-medium text-foreground">{u.name}</span>
								{#if u.email}
									<span class="truncate text-xs text-muted-foreground">{u.email}</span>
								{/if}
							</div>
						</div>
						<!-- Rolle -->
						<div class="w-40 shrink-0 text-sm text-text-body">{roleLabel(u.role)}</div>
						<!-- Sist aktiv -->
						<div class="w-[150px] shrink-0 text-sm text-text-body">{lastActiveLabel(u.last_active)}</div>
						<!-- Status -->
						<div class="w-[130px] shrink-0">
							<span
								class="inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium {pill.cls}"
							>
								<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"
								></span>
								{pill.label}
							</span>
						</div>
						<!-- Handling -->
						<div class="flex w-16 shrink-0 items-center justify-center">
							{#if isOwner || isSelf}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger class={triggerClass} aria-label="Handlinger for {u.name}">
										<Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onSelect={() => openEdit(u, isOwner && !isSelf)}>
											{isSelf ? 'Rediger min profil' : 'Rediger'}
										</DropdownMenu.Item>
										{#if isOwner && !isSelf}
											<DropdownMenu.Separator />
											<DropdownMenu.Item
												class="text-destructive data-highlighted:text-destructive"
												onSelect={() => askDelete(u)}
											>
												Fjern bruker
											</DropdownMenu.Item>
										{/if}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<p class="text-xs text-muted-foreground">
		Eier kan endre alt. Ansatte ser booking, henvendelser og kunder.
	</p>
</div>

<InviteUserDrawer bind:open={inviteOpen} {businessId} {onsaved} />

<EditUserDrawer bind:open={editOpen} user={editingUser} canEditRole={editCanRole} {onsaved} />

<ConfirmDialog
	bind:open={confirmOpen}
	title="Fjerne brukeren?"
	description={userToDelete
		? `«${userToDelete.name}» mister tilgangen til dashbordet. Dette kan ikke angres.`
		: undefined}
	confirmLabel="Fjern"
	cancelLabel="Avbryt"
	destructive
	onconfirm={deleteUser}
/>
