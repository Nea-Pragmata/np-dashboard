/**
 * Route-local metadata + derivations for AI-jobber. Job types carry a Norwegian
 * label + a one-line description (shown in the «Sett opp» drawer). Interval,
 * last-run and result strings are derived here — the collections store raw enums
 * + a free-form `findings` JSON, so the human copy lives in one place.
 */
import {
	AiJobsTypeOptions,
	AiJobsIntervalOptions,
	type AiJobsResponse,
	type AiJobRunsResponse,
	type BusinessesResponse
} from '$lib/pocketbase-types';

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface JobTypeMeta {
	value: AiJobsTypeOptions;
	label: string;
	description: string;
}

/** The five AI job types, with the description shown when configuring one. */
export const JOB_TYPES: readonly JobTypeMeta[] = [
	{
		value: AiJobsTypeOptions.security_scan,
		label: 'Sikkerhetsskann',
		description:
			'Skanner nettsted, avhengigheter og skjemaer for sårbarheter. Alvorlige funn varsles umiddelbart.'
	},
	{
		value: AiJobsTypeOptions.seo,
		label: 'SEO-gjennomgang',
		description: 'Går gjennom sidene for SEO-forbedringer og foreslår konkrete tiltak.'
	},
	{
		value: AiJobsTypeOptions.content_suggestions,
		label: 'Innholdsforslag',
		description: 'Lager utkast til poster og innhold som kunden kan godkjenne.'
	},
	{
		value: AiJobsTypeOptions.review_replies,
		label: 'Anmeldelsessvar',
		description: 'Foreslår svar på nye anmeldelser i kundens egen stemme.'
	},
	{
		value: AiJobsTypeOptions.alt_text,
		label: 'Alt-tekst for bilder',
		description: 'Legger til alt-tekst på bilder for tilgjengelighet og bedre SEO.'
	}
];

export function jobTypeLabel(type: string): string {
	return JOB_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function jobTypeDescription(type: string): string {
	return JOB_TYPES.find((t) => t.value === type)?.description ?? '';
}

export interface IntervalMeta {
	value: AiJobsIntervalOptions;
	label: string;
}

/** Interval choices for the drawer select. */
export const INTERVAL_OPTIONS: readonly IntervalMeta[] = [
	{ value: AiJobsIntervalOptions.daily, label: 'Daglig' },
	{ value: AiJobsIntervalOptions.weekly, label: 'Ukentlig' },
	{ value: AiJobsIntervalOptions.monthly, label: 'Månedlig' },
	{ value: AiJobsIntervalOptions.event, label: 'Ved hendelse' }
];

/** Hourly time options for `run_at` (ignored for event-based jobs). */
export const TIME_OPTIONS: readonly string[] = Array.from(
	{ length: 24 },
	(_, h) => `${String(h).padStart(2, '0')}:00`
);

/** «Daglig kl. 03:00» / «Ukentlig kl. 09:00» / «Månedlig» / «Ved hendelse». */
export function intervalLabel(interval: string, runAt?: string): string {
	if (interval === AiJobsIntervalOptions.event) return 'Ved hendelse';
	const base =
		INTERVAL_OPTIONS.find((i) => i.value === interval)?.label ?? interval;
	return runAt ? `${base} kl. ${runAt}` : base;
}

const dayMonthFormatter = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('nb-NO', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'UTC'
});

function startOfDayUTC(d: Date): number {
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function daysSince(iso: string): number {
	return Math.round((startOfDayUTC(new Date()) - startOfDayUTC(new Date(iso))) / 86_400_000);
}

/** Human «siste kjøring»: «I natt 03:12» / «I går» / «For 3 dager siden» / «30. juni». */
export function lastRunLabel(iso?: string): string {
	if (!iso) return 'Ikke kjørt ennå';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '—';
	const days = daysSince(iso);
	if (days <= 0) {
		const time = timeFormatter.format(d);
		return d.getUTCHours() < 6 ? `I natt ${time}` : `I dag ${time}`;
	}
	if (days === 1) return 'I går';
	if (days < 7) return `For ${days} dager siden`;
	return dayMonthFormatter.format(d);
}

export type ResultPill = { label: string; tone: Tone } | null;

type JobRunLike = Pick<AiJobRunsResponse, 'result'> & { findings?: unknown };

/**
 * Turn a run's `result` + free-form `findings` JSON into a small pill. `ok` reads
 * positive (green), `findings` reads actionable (blue), `error` reads red. The
 * label prefers `findings.summary`, then a count from known keys.
 */
export function resultPill(run: JobRunLike | null | undefined): ResultPill {
	if (!run) return null;
	const f = (run.findings ?? null) as Record<string, unknown> | null;
	const summary = typeof f?.summary === 'string' ? f.summary : null;

	if (run.result === 'error') return { label: 'Feil ved kjøring', tone: 'error' };
	if (run.result === 'findings') {
		if (summary) return { label: summary, tone: 'info' };
		if (typeof f?.drafts === 'number') return { label: `${f.drafts} utkast`, tone: 'info' };
		if (Array.isArray(f?.suggestions)) return { label: `${f.suggestions.length} forslag`, tone: 'info' };
		return { label: 'Nye funn', tone: 'info' };
	}
	return { label: summary ?? 'Ingen funn', tone: 'success' };
}

type JobLike = Pick<AiJobsResponse, 'businesses'> & {
	expand?: { businesses?: BusinessesResponse[] };
};

/** «Alle bedrifter» / a single name / «N bedrifter» for the BEDRIFT column. */
export function businessesLabel(job: JobLike, totalBusinesses: number): string {
	const ids = job.businesses ?? [];
	const names = job.expand?.businesses ?? [];
	if (ids.length === 0) return 'Ingen';
	if (totalBusinesses > 0 && ids.length >= totalBusinesses) return 'Alle bedrifter';
	if (names.length === 1) return names[0].name;
	if (ids.length === 1) return '1 bedrift';
	return `${ids.length} bedrifter`;
}
