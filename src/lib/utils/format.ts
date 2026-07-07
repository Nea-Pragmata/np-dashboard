/**
 * Norwegian (nb-NO) formatting helpers. Keep all user-facing number/date
 * formatting here so the app reads consistently: amounts as "1 250 kr",
 * dates as "man. 6. juli".
 */

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
	return value instanceof Date ? value : new Date(value);
}

const krFormatter = new Intl.NumberFormat('nb-NO', {
	maximumFractionDigits: 0
});

/** "1 250 kr" — space-grouped, no decimals, suffixed with " kr". */
export function formatKr(amount: number): string {
	return `${krFormatter.format(amount)} kr`;
}

const dateFormatter = new Intl.DateTimeFormat('nb-NO', {
	weekday: 'short',
	day: 'numeric',
	month: 'long'
});

/** "man. 6. juli" — short weekday, numeric day, long month. */
export function formatDate(date: DateInput): string {
	return dateFormatter.format(toDate(date));
}

const dateTimeFormatter = new Intl.DateTimeFormat('nb-NO', {
	weekday: 'short',
	day: 'numeric',
	month: 'long',
	hour: '2-digit',
	minute: '2-digit'
});

/** "man. 6. juli, 09:00" — {@link formatDate} plus 24h time. */
export function formatDateTime(date: DateInput): string {
	return dateTimeFormatter.format(toDate(date));
}

const relativeFormatter = new Intl.RelativeTimeFormat('nb-NO', { numeric: 'auto' });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 60 * 60 * 24 * 365],
	['month', 60 * 60 * 24 * 30],
	['week', 60 * 60 * 24 * 7],
	['day', 60 * 60 * 24],
	['hour', 60 * 60],
	['minute', 60],
	['second', 1]
];

/** "for 2 timer siden" / "om 3 dager" — relative to now, in Norwegian. */
export function relativeTime(date: DateInput): string {
	const diffSec = Math.round((toDate(date).getTime() - Date.now()) / 1000);
	const absSec = Math.abs(diffSec);
	for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
		if (absSec >= secondsInUnit || unit === 'second') {
			return relativeFormatter.format(Math.round(diffSec / secondsInUnit), unit);
		}
	}
	return relativeFormatter.format(0, 'second');
}

/**
 * Up-to-two-letter avatar initials from a name (or e-post fallback). "Anne
 * Berg" → "AB", "Frisør Oslo" → "FO", "berit@bo.no" → "BE".
 */
export function initials(nameOrEmail: string): string {
	const value = nameOrEmail.trim();
	if (!value) return '?';
	const base = value.includes('@') ? value.split('@')[0] : value;
	const parts = base.split(/[\s._-]+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
	frisor: 'Frisørsalong',
	bilforhandler: 'Bilforhandler',
	tomrer: 'Tømrer',
	annet: 'Bedrift'
};

/** Human, Norwegian label for a `businesses.type` value. */
export function businessTypeLabel(type: string): string {
	return BUSINESS_TYPE_LABELS[type] ?? 'Bedrift';
}

/** Norwegian role label; agency members read differently from tenant users. */
export function roleLabel(role: string, agency = false): string {
	if (agency) return role === 'owner' ? 'Byråeier' : 'Byråansatt';
	return role === 'owner' ? 'Eier' : 'Ansatt';
}
