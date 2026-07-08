/**
 * Route-local derivations for «Drift & status». `site_status` has no single
 * status enum, so hosting/SSL/backup/SEO health are derived here into small
 * {label, tone} pills. Kept out of the shared StatusBadge (which is keyed by
 * collection+enum) because these are computed, business-operations labels.
 */

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** A derived status pill, or `null` when there is nothing to show («—»). */
export type Pill = { label: string; tone: Tone } | null;

const dayMonthFormatter = new Intl.DateTimeFormat('nb-NO', {
	day: 'numeric',
	month: 'long'
});

/** «28. juni» — day + long month, no weekday, no year. */
export function shortDate(iso?: string): string {
	if (!iso) return '—';
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? '—' : dayMonthFormatter.format(d);
}

function startOfDay(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysSince(iso: string): number {
	return Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
}

/** Hosting health derived from the business lifecycle status. */
export function hostingPill(businessStatus: string): Pill {
	switch (businessStatus) {
		case 'active':
			return { label: 'OK', tone: 'success' };
		case 'onboarding':
			return { label: 'Settes opp', tone: 'info' };
		case 'paused':
			return { label: 'Pauset', tone: 'warning' };
		default:
			return { label: 'Ukjent', tone: 'neutral' };
	}
}

/** SSL certificate health from `site_status.ssl_status`. */
export function sslPill(ssl?: string): Pill {
	switch (ssl) {
		case 'ok':
			return { label: 'Gyldig', tone: 'success' };
		case 'warning':
			return { label: 'Utløper snart', tone: 'warning' };
		case 'error':
			return { label: 'Utløpt', tone: 'error' };
		default:
			return { label: 'Mangler', tone: 'warning' };
	}
}

/** Backup freshness: a nightly backup (today/yesterday) reads «I natt». */
export function backupPill(lastBackup?: string): Pill {
	if (!lastBackup) return null;
	const d = new Date(lastBackup);
	if (Number.isNaN(d.getTime())) return null;
	const days = daysSince(lastBackup);
	if (days <= 1) return { label: 'I natt', tone: 'success' };
	if (days <= 7) return { label: shortDate(lastBackup), tone: 'neutral' };
	return { label: shortDate(lastBackup), tone: 'warning' };
}

/** SEO review: a future date is «Planlagt …»; a stale one turns amber. */
export function seoPill(seoDate?: string): Pill {
	if (!seoDate) return null;
	const d = new Date(seoDate);
	if (Number.isNaN(d.getTime())) return null;
	const days = daysSince(seoDate);
	if (days < 0) return { label: `Planlagt ${shortDate(seoDate)}`, tone: 'info' };
	if (days <= 30) return { label: shortDate(seoDate), tone: 'success' };
	return { label: shortDate(seoDate), tone: 'warning' };
}

/** True when a task is open and its deadline is within the next three days. */
export function isUrgent(status: string, dueDate?: string): boolean {
	if (status !== 'open' || !dueDate) return false;
	const due = new Date(dueDate).getTime();
	if (Number.isNaN(due)) return false;
	return due <= Date.now() + 3 * 86_400_000;
}

/** Average uptime across businesses, formatted «99,9 %» (or «—» when empty). */
const uptimeFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
export function formatUptime(values: number[]): string {
	if (values.length === 0) return '—';
	const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
	return `${uptimeFormatter.format(avg)} %`;
}
