/**
 * Week/date helpers for the Booking calendar.
 *
 * Everything here operates in **UTC**. Booking start/end are seeded and rendered
 * as literal wall-clock stored as UTC ("09:00" → 09:00Z, see docs/LEDGER.md), so
 * day-column bucketing and week math must use the UTC components of a Date to
 * stay aligned with `formatTime` (which also renders in UTC). Using local time
 * here would shift bookings by the viewer's offset and land them in the wrong
 * day/hour.
 */

/** UTC midnight of `date` (drops any time-of-day). */
function utcMidnight(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Monday 00:00:00Z of the week containing `date`. */
export function weekStart(date: Date): Date {
	const d = utcMidnight(date);
	const daysSinceMonday = (d.getUTCDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0 …
	d.setUTCDate(d.getUTCDate() - daysSinceMonday);
	return d;
}

/** A new Date `n` days after `date` (UTC). */
export function addDays(date: Date, n: number): Date {
	const d = new Date(date);
	d.setUTCDate(d.getUTCDate() + n);
	return d;
}

/** "YYYY-MM-DD" for a Date, taken in UTC (used for the ?uke= param + PB filter). */
export function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Parse "YYYY-MM-DD" to a UTC-midnight Date, or null if malformed. */
export function parseIsoDate(value: string | null | undefined): Date | null {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const d = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Minutes past UTC-midnight for a Date. */
export function minutesOfDay(date: Date): number {
	return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** "09:00" → 540. Returns null for malformed input. */
export function hhmmToMinutes(value: string | null | undefined): number | null {
	if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
	const [h, m] = value.split(':').map(Number);
	return h * 60 + m;
}

/** ISO-8601 week number (weeks start Monday; week 1 holds the first Thursday). */
export function isoWeekNumber(date: Date): number {
	const d = utcMidnight(date);
	// Shift to the Thursday of this week, then diff against year's first Thursday.
	d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
	const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
	firstThursday.setUTCDate(
		firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3
	);
	return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

// Order matches JS getUTCDay() offset from Monday; keys match businesses.opening_hours.
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Opening hours shape stored on `businesses.opening_hours`. */
export type OpeningHours = Partial<
	Record<DayKey, { open?: string | null; close?: string | null } | null>
>;
