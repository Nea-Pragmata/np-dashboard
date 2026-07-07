import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Package from '@lucide/svelte/icons/package';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import Inbox from '@lucide/svelte/icons/inbox';
import Users from '@lucide/svelte/icons/users';
import Megaphone from '@lucide/svelte/icons/megaphone';
import Star from '@lucide/svelte/icons/star';
import ChartColumn from '@lucide/svelte/icons/chart-column';
import Globe from '@lucide/svelte/icons/globe';
import Settings from '@lucide/svelte/icons/settings';

/** All Lucide icons share this component signature. */
type IconComponent = typeof Settings;

/**
 * Canonical `businesses.modules` keys — a JSON object of booleans, one per key.
 * These are the operational modules; a tenant with all of them false is a pure
 * website tenant. «Oversikt», «Nettsted & SEO» and «Innstillinger» are always-on
 * (not module-gated); «Statistikk» is gated behind {@link hasAnyModule}.
 */
export const MODULE_KEYS = [
	'booking',
	'catalog',
	'inquiries',
	'customers',
	'campaigns',
	'links',
	'social',
	'ads',
	'reviews',
	'waitlist'
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Shape of the `businesses.modules` JSON field. */
export type BusinessModules = Partial<Record<ModuleKey, boolean>>;

/** True when the tenant has at least one operational module enabled. */
export function hasAnyModule(modules: BusinessModules | null | undefined): boolean {
	return MODULE_KEYS.some((key) => Boolean(modules?.[key]));
}

export type NavGroup = 'DRIFT' | 'VEKST' | 'NETTSTED';

/** Render order for the sidebar section headers. */
export const NAV_GROUPS: readonly NavGroup[] = ['DRIFT', 'VEKST', 'NETTSTED'];

/**
 * Visibility gate for a nav item:
 * - `'always'` — shown regardless of enabled modules
 * - `'any-module'` — shown only when {@link hasAnyModule} is true
 * - a {@link ModuleKey} — shown only when that specific module is enabled
 */
export type NavGate = ModuleKey | 'always' | 'any-module';

export interface NavItem {
	key: NavGate;
	group: NavGroup;
	label: string;
	icon: IconComponent;
	href: string;
}

/** Declarative customer-dashboard menu, filtered per tenant by {@link filterNav}. */
export const NAV: readonly NavItem[] = [
	// DRIFT
	{ key: 'always', group: 'DRIFT', label: 'Oversikt', icon: LayoutDashboard, href: '/oversikt' },
	{ key: 'catalog', group: 'DRIFT', label: 'Katalog', icon: Package, href: '/katalog' },
	{ key: 'booking', group: 'DRIFT', label: 'Booking', icon: CalendarDays, href: '/booking' },
	{ key: 'inquiries', group: 'DRIFT', label: 'Henvendelser', icon: Inbox, href: '/henvendelser' },
	{ key: 'customers', group: 'DRIFT', label: 'Kunder', icon: Users, href: '/kunder' },
	// VEKST
	{ key: 'campaigns', group: 'VEKST', label: 'Markedsføring', icon: Megaphone, href: '/markedsforing' },
	{ key: 'reviews', group: 'VEKST', label: 'Anmeldelser', icon: Star, href: '/anmeldelser' },
	{ key: 'any-module', group: 'VEKST', label: 'Statistikk', icon: ChartColumn, href: '/statistikk' },
	// NETTSTED
	{ key: 'always', group: 'NETTSTED', label: 'Nettsted & SEO', icon: Globe, href: '/nettsted' },
	{ key: 'always', group: 'NETTSTED', label: 'Innstillinger', icon: Settings, href: '/innstillinger' }
];

/**
 * Return the nav items visible for a tenant: every `'always'` item, the
 * `'any-module'` items when at least one operational module is enabled, plus the
 * module-gated items whose specific key is enabled in `businesses.modules`.
 */
export function filterNav(modules: BusinessModules | null | undefined): NavItem[] {
	return NAV.filter((item) => {
		if (item.key === 'always') return true;
		if (item.key === 'any-module') return hasAnyModule(modules);
		return Boolean(modules?.[item.key]);
	});
}
