/**
 * The five Innstillinger tabs (fanes) and their route slugs. Kept in one place so
 * the [fane] load can validate the slug and the tab bar can render the labels in
 * the design's order (Bedriftsprofil, Domene & e-post, Team & brukere,
 * Integrasjoner, Abonnement & moduler). Innstillinger is always-on for every
 * tenant, so no module gating applies here.
 */
export const FANES = [
	{ slug: 'bedriftsprofil', label: 'Bedriftsprofil' },
	{ slug: 'domene-epost', label: 'Domene & e-post' },
	{ slug: 'team', label: 'Team & brukere' },
	{ slug: 'integrasjoner', label: 'Integrasjoner' },
	{ slug: 'abonnement', label: 'Abonnement & moduler' }
] as const;

export type FaneSlug = (typeof FANES)[number]['slug'];

/** Default tab when none/invalid is given. */
export const DEFAULT_FANE: FaneSlug = 'bedriftsprofil';

export function isFaneSlug(value: string): value is FaneSlug {
	return FANES.some((f) => f.slug === value);
}
