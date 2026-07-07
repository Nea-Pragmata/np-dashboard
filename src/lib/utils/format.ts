/**
 * Norwegian (nb-NO) formatting helpers. Keep all user-facing number/date
 * formatting here so the app reads consistently: amounts as "1 250 kr",
 * dates as "man. 6. juli".
 */

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
	return value instanceof Date ? value : new Date(value);
}

const numberFormatter = new Intl.NumberFormat('nb-NO', {
	maximumFractionDigits: 0
});

/** "1 248" — space-grouped integer (nb-NO thousands separator), no decimals. */
export function formatNumber(value: number): string {
	return numberFormatter.format(value);
}

/** "1 250 kr" — {@link formatNumber} suffixed with " kr". */
export function formatKr(amount: number): string {
	return `${numberFormatter.format(amount)} kr`;
}

// Unit suffixes appended after " kr" for hourly / per-m² pricing. "stk" (per
// item) reads as a plain amount, so it gets no suffix.
const PRICE_UNIT_SUFFIX: Record<string, string> = {
	time: '/time',
	per_m2: '/m²'
};

/**
 * Catalog price rendered per its price_type:
 *   - fixed      → "1 250 kr"
 *   - from       → "Fra 1 250 kr"
 *   - on_request → "På forespørsel"
 * A `price_unit` of `time`/`per_m2` appends "/time" / "/m²".
 */
export function formatCatalogPrice(
	priceType: string,
	price?: number | null,
	priceUnit?: string | null
): string {
	if (priceType === 'on_request') return 'På forespørsel';
	const amount = formatKr(price ?? 0);
	const suffix = priceUnit ? (PRICE_UNIT_SUFFIX[priceUnit] ?? '') : '';
	return priceType === 'from' ? `Fra ${amount}${suffix}` : `${amount}${suffix}`;
}

/**
 * URL-safe slug from a Norwegian name: "Dameklipp, klipp & føn" → "dameklipp-
 * klipp-foen". Æ/Ø/Å are transliterated; everything else non-alphanumeric
 * collapses to single hyphens.
 */
export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/æ/g, 'ae')
		.replace(/ø/g, 'oe')
		.replace(/å/g, 'aa')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
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

// Renders the stored wall-clock time in UTC. Booking times are currently seeded
// as literal UTC ("09:00" → 09:00Z), so formatting in UTC yields the intended
// local clock (09:00) rather than a +offset shift. The definitive booking
// timezone handling is deferred to the booking milestone (see docs/LEDGER.md).
const timeFormatter = new Intl.DateTimeFormat('nb-NO', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: 'UTC'
});

/** "09:00" — 24h wall-clock time (see {@link timeFormatter} on timezone). */
export function formatTime(date: DateInput): string {
	return timeFormatter.format(toDate(date));
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

// Short industry noun for the catalog's "Bransjefelter · FRISØR" section header
// (distinct from the longer businessTypeLabel "Frisørsalong").
const INDUSTRY_LABELS: Record<string, string> = {
	frisor: 'Frisør',
	bilforhandler: 'Bilforhandler',
	tomrer: 'Tømrer',
	annet: 'Bedrift'
};

/** Short industry noun for a `businesses.type` value (e.g. "Frisør"). */
export function industryLabel(type: string): string {
	return INDUSTRY_LABELS[type] ?? 'Bedrift';
}

/** Norwegian role label; agency members read differently from tenant users. */
export function roleLabel(role: string, agency = false): string {
	if (agency) return role === 'owner' ? 'Byråeier' : 'Byråansatt';
	return role === 'owner' ? 'Eier' : 'Ansatt';
}
