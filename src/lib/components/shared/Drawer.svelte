<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		Sheet,
		SheetContent,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet';
	import { cn } from '$lib/utils.js';

	let {
		open = $bindable(false),
		title,
		description,
		titleSrOnly = false,
		children,
		footer,
		class: className
	}: {
		open?: boolean;
		/** Required for a11y (bits-ui Dialog). Set `titleSrOnly` to hide visually. */
		title: string;
		description?: string;
		titleSrOnly?: boolean;
		/** Body content. */
		children?: Snippet;
		/** Footer actions — one secondary + one primary button. */
		footer?: Snippet;
		/** Extra classes on the body scroll region. */
		class?: string;
	} = $props();
</script>

<Sheet bind:open>
	<!--
		440px drawer over the scrim. Inline width beats SheetContent's default
		w-3/4 + sm:max-w-sm; max-width:100vw keeps it inside the viewport on mobile
		(≤390px) where 440 would overflow.
	-->
	<SheetContent
		side="right"
		class="gap-0 p-0"
		style="width: var(--drawer-width); max-width: 100vw;"
	>
		{#if titleSrOnly}
			<SheetTitle class="sr-only">{title}</SheetTitle>
			{#if description}
				<SheetDescription class="sr-only">{description}</SheetDescription>
			{/if}
		{:else}
			<div class="border-b border-border p-6 pr-14">
				<SheetTitle class="text-lg font-semibold text-foreground">{title}</SheetTitle>
				{#if description}
					<SheetDescription class="mt-1 text-sm text-muted-foreground">
						{description}
					</SheetDescription>
				{/if}
			</div>
		{/if}

		<div class={cn('min-h-0 flex-1 overflow-y-auto p-6', className)}>
			{@render children?.()}
		</div>

		{#if footer}
			<div
				class="flex flex-row items-center justify-end gap-3 border-t border-border p-6"
			>
				{@render footer()}
			</div>
		{/if}
	</SheetContent>
</Sheet>
