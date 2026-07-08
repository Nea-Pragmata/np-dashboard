/**
 * Route-local helpers for the Tilganger (agency access) page. Kept out of the
 * shared `format.ts` (owned elsewhere): these are specific to agency-member
 * management — role/status labels, the «sist aktiv» relative-day string, the
 * allowed-businesses scope summary, and small id/password generators for the
 * atomic invite batch.
 */
import { AgencyMembersRoleOptions, AgencyMembersStatusOptions } from '$lib/pocketbase-types';
import type { StatusTone } from '$lib/components/shared/StatusBadge.svelte';

/** Agency-role choices for the drawer select (Byråeier = full access). */
export const ROLE_OPTIONS = [
	{ value: AgencyMembersRoleOptions.owner, label: 'Byråeier' },
	{ value: AgencyMembersRoleOptions.staff, label: 'Byråansatt' }
] as const;

/** Byråeier / Byråansatt for an `agency_members.role` value. */
export function agencyRoleLabel(role: string): string {
	return role === AgencyMembersRoleOptions.owner ? 'Byråeier' : 'Byråansatt';
}

/** Status choices for the drawer select. */
export const STATUS_OPTIONS = [
	{ value: AgencyMembersStatusOptions.active, label: 'Aktiv' },
	{ value: AgencyMembersStatusOptions.invited, label: 'Invitert' },
	{ value: AgencyMembersStatusOptions.disabled, label: 'Deaktivert' }
] as const;

type StatusMeta = { label: string; tone: StatusTone };

const STATUS_META: Record<string, StatusMeta> = {
	[AgencyMembersStatusOptions.active]: { label: 'Aktiv', tone: 'success' },
	[AgencyMembersStatusOptions.invited]: { label: 'Invitert', tone: 'warning' },
	[AgencyMembersStatusOptions.disabled]: { label: 'Deaktivert', tone: 'neutral' }
};

/** {label, tone} for an `agency_members.status` value (StatusBadge has no agency map). */
export function memberStatusMeta(status: string): StatusMeta {
	return STATUS_META[status] ?? { label: status, tone: 'neutral' };
}

/** Tone → NP badge classes, mirroring StatusBadge's palette (which we can't edit). */
export const TONE_BADGE: Record<StatusTone, string> = {
	success: 'bg-success-bg text-success',
	warning: 'bg-warning-bg text-warning',
	error: 'bg-error-bg text-error',
	info: 'bg-accent-blue-bg text-accent-blue-text',
	neutral: 'bg-muted text-muted-foreground'
};

/**
 * Scope summary for `allowed_businesses`: an EMPTY list means access to ALL
 * businesses (owner convention), otherwise «N utvalgte».
 */
export function scopeLabel(allowed: readonly string[] | undefined): string {
	const n = allowed?.length ?? 0;
	if (n === 0) return 'Alle bedrifter';
	return `${n} utvalgte`;
}

const dayMonthFormatter = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long' });

function startOfDay(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * «Sist aktiv» as a day-relative string: today → «I dag», yesterday → «I går»,
 * within a week → «For N dager siden», otherwise a «12. mai» date. An absent
 * timestamp (e.g. a still-invited member) renders «—».
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

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * A PocketBase-shaped record id (15 lowercase alphanumerics). Generated up front
 * so an invited user and its membership can be linked inside a single atomic
 * create batch (no id-chaining across batch requests).
 */
export function generateRecordId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	let out = '';
	for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
	return out;
}

/** A throwaway strong password for an invited member (they set their own via invite). */
export function generatePassword(): string {
	return `${crypto.randomUUID()}Aa1!`;
}
