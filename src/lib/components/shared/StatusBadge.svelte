<script lang="ts" module>
	/** Semantic tone → NP colour tokens. */
	export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

	type StatusEntry = { label: string; tone: StatusTone };

	/**
	 * Central status map: {collection, status} → {bokmål label, tone}. One place
	 * to translate PocketBase enum values into user-facing badges. Covers booking
	 * + inquiry (+ review) statuses today; extend per collection as pages land.
	 */
	const STATUS_MAP: Record<string, Record<string, StatusEntry>> = {
		bookings: {
			pending: { label: 'Venter', tone: 'warning' },
			confirmed: { label: 'Bekreftet', tone: 'success' },
			cancelled: { label: 'Avlyst', tone: 'error' },
			done: { label: 'Fullført', tone: 'neutral' }
		},
		inquiries: {
			new: { label: 'Ny', tone: 'info' },
			in_progress: { label: 'Under arbeid', tone: 'warning' },
			done: { label: 'Fullført', tone: 'success' }
		},
		products: {
			active: { label: 'Aktiv', tone: 'success' },
			hidden: { label: 'Skjult', tone: 'neutral' },
			sold: { label: 'Solgt', tone: 'info' }
		},
		reviews: {
			new: { label: 'Ubesvart', tone: 'warning' },
			replied: { label: 'Besvart', tone: 'success' }
		},
		// Derived website-health states (site_status has no single status enum).
		site_status: {
			ok: { label: 'I orden', tone: 'success' },
			warning: { label: 'Se over', tone: 'warning' },
			error: { label: 'Feil', tone: 'error' },
			missing: { label: 'Mangler', tone: 'warning' },
			unknown: { label: 'Ukjent', tone: 'neutral' }
		},
		campaigns: {
			draft: { label: 'Utkast', tone: 'neutral' },
			scheduled: { label: 'Planlagt', tone: 'info' },
			sent: { label: 'Sendt', tone: 'success' }
		},
		social_posts: {
			draft: { label: 'Utkast', tone: 'neutral' },
			pending_approval: { label: 'Til godkjenning', tone: 'warning' },
			approved: { label: 'Godkjent', tone: 'info' },
			published: { label: 'Publisert', tone: 'success' }
		},
		pages: {
			published: { label: 'Publisert', tone: 'success' },
			draft: { label: 'Utkast', tone: 'neutral' }
		},
		forms: {
			active: { label: 'Aktivt', tone: 'success' },
			draft: { label: 'Utkast', tone: 'neutral' }
		},
		businesses: {
			active: { label: 'Aktiv', tone: 'success' },
			onboarding: { label: 'Onboarding', tone: 'info' },
			paused: { label: 'Pauset', tone: 'warning' }
		},
		subscriptions: {
			active: { label: 'Aktivt', tone: 'success' },
			paused: { label: 'Pauset', tone: 'warning' },
			ended: { label: 'Avsluttet', tone: 'neutral' }
		},
		integrations: {
			connected: { label: 'Tilkoblet', tone: 'success' },
			error: { label: 'Feil', tone: 'error' },
			not_connected: { label: 'Ikke tilkoblet', tone: 'neutral' }
		},
		ai_jobs: {
			active: { label: 'Aktiv', tone: 'success' },
			paused: { label: 'Pauset', tone: 'neutral' }
		},
		ai_job_runs: {
			ok: { label: 'OK', tone: 'success' },
			findings: { label: 'Funn', tone: 'warning' },
			error: { label: 'Feil', tone: 'error' }
		},
		agency_tasks: {
			open: { label: 'Åpen', tone: 'warning' },
			done: { label: 'Fullført', tone: 'success' }
		},
		agency_leads: {
			new: { label: 'Ny', tone: 'info' },
			in_dialog: { label: 'I dialog', tone: 'warning' },
			won: { label: 'Vunnet', tone: 'success' },
			lost: { label: 'Tapt', tone: 'neutral' }
		},
		agency_call_slots: {
			open: { label: 'Ledig', tone: 'info' },
			booked: { label: 'Booket', tone: 'success' }
		},
		waitlist_entries: {
			waiting: { label: 'Venter', tone: 'warning' },
			notified: { label: 'Varslet', tone: 'info' },
			booked: { label: 'Booket', tone: 'success' },
			expired: { label: 'Utløpt', tone: 'neutral' }
		}
	};

	const TONE_CLASS: Record<StatusTone, string> = {
		success: 'bg-success-bg text-success',
		warning: 'bg-warning-bg text-warning',
		error: 'bg-error-bg text-error',
		info: 'bg-accent-blue-bg text-accent-blue-text',
		neutral: 'bg-muted text-muted-foreground'
	};

	/** Look up the label + tone for a status, falling back to a neutral raw label. */
	export function statusMeta(collection: string, status: string): StatusEntry {
		return STATUS_MAP[collection]?.[status] ?? { label: status, tone: 'neutral' };
	}
</script>

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils.js';

	let {
		collection,
		status,
		dot = true,
		class: className
	}: {
		collection: string;
		status: string;
		/** Show the leading colour dot (per NP «Statusmerke»). */
		dot?: boolean;
		class?: string;
	} = $props();

	const meta = $derived(statusMeta(collection, status));
</script>

<Badge
	class={cn(
		'h-[22px] gap-1.5 rounded-full border-transparent px-2 text-xs font-medium',
		TONE_CLASS[meta.tone],
		className
	)}
>
	{#if dot}
		<span class="size-1.5 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true"></span>
	{/if}
	{meta.label}
</Badge>
