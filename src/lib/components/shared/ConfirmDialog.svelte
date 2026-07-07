<script lang="ts">
	import {
		AlertDialog,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogFooter,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogCancel,
		AlertDialogAction
	} from '$lib/components/ui/alert-dialog';
	import { cn } from '$lib/utils.js';

	let {
		open = $bindable(false),
		title = 'Er du sikker?',
		description,
		confirmLabel = 'Bekreft',
		cancelLabel = 'Avbryt',
		destructive = false,
		onconfirm
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** Renders the confirm button as a solid red action. */
		destructive?: boolean;
		/** Fired when the user confirms. The dialog closes itself afterwards. */
		onconfirm?: () => void;
	} = $props();

	function handleConfirm() {
		// bits-ui's AlertDialog.Action does not close the dialog on click (only
		// Cancel does), so close it here — otherwise a second click re-fires the
		// action (e.g. re-deleting an already-removed record → 404).
		open = false;
		onconfirm?.();
	}
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>{title}</AlertDialogTitle>
			{#if description}
				<AlertDialogDescription>{description}</AlertDialogDescription>
			{/if}
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
			<AlertDialogAction
				class={cn(destructive && 'bg-destructive text-white hover:bg-destructive/90')}
				onclick={handleConfirm}
			>
				{confirmLabel}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
