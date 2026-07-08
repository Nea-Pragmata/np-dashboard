/**
 * Route-local formatting for the Bedrifter table. Kept out of the shared
 * `format.ts` (owned elsewhere): these labels are specific to the admin business
 * list — a short industry noun and a «sist aktiv» relative-day string.
 */

const BRANSJE_LABELS: Record<string, string> = {
	frisor: 'Frisør',
	bilforhandler: 'Bilforhandler',
	tomrer: 'Tømrer',
	annet: 'Annet'
};

/** Short industry label for the admin list (e.g. «Frisør», «Annet»). */
export function bransjeLabel(type: string): string {
	return BRANSJE_LABELS[type] ?? 'Annet';
}

const dayMonthFormatter = new Intl.DateTimeFormat('nb-NO', {
	day: 'numeric',
	month: 'long'
});

function startOfDay(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * «Sist aktiv» as a human day-relative string: today → «I dag», yesterday →
 * «I går», within a week → «For N dager siden», otherwise a «12. mai» date.
 * An absent timestamp (e.g. a business still onboarding) renders «—».
 */
export function formatLastActive(iso?: string): string {
	if (!iso) return '—';
	const then = new Date(iso);
	if (Number.isNaN(then.getTime())) return '—';
	const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
	if (days <= 0) return 'I dag';
	if (days === 1) return 'I går';
	if (days < 7) return `For ${days} dager siden`;
	return dayMonthFormatter.format(then);
}
