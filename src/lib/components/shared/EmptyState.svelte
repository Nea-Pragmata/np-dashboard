<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import * as Empty from '$lib/components/ui/empty';
	import { cn } from '$lib/utils.js';

	type IconComponent = Component<{ class?: string }>;

	let {
		icon,
		title,
		description,
		action,
		class: className
	}: {
		icon?: IconComponent;
		title: string;
		description?: string;
		/** Optional call-to-action rendered below the copy. */
		action?: Snippet;
		class?: string;
	} = $props();

	const Icon = $derived(icon);
</script>

<Empty.Root class={cn('border-0 px-6 py-10', className)}>
	<Empty.Header>
		{#if Icon}
			<Empty.Media variant="icon"><Icon class="size-4" /></Empty.Media>
		{/if}
		<Empty.Title>{title}</Empty.Title>
		{#if description}
			<Empty.Description>{description}</Empty.Description>
		{/if}
	</Empty.Header>
	{#if action}
		<Empty.Content>{@render action()}</Empty.Content>
	{/if}
</Empty.Root>
