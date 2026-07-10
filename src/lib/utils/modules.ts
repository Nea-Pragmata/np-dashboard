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

/** Norwegian label per operational module key (MODULE_KEYS order). One source for all module UIs. */
export const MODULE_LABELS: Record<ModuleKey, string> = {
	booking: 'Booking',
	catalog: 'Katalog',
	inquiries: 'Henvendelser',
	customers: 'Kunder & lojalitet',
	campaigns: 'Kampanjer',
	links: 'Lenker',
	social: 'Sosiale medier',
	ads: 'Annonser',
	reviews: 'Anmeldelser',
	waitlist: 'Venteliste'
};

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

/**
 * Priority order for the mobile bottom tab bar's middle slots. Booking and
 * Henvendelser lead (matching Figma 285:5493); the rest fill in for tenants that
 * lack them so the bar always surfaces the tenant's most useful primary modules.
 */
const MOBILE_TAB_ORDER: readonly ModuleKey[] = [
	'booking',
	'inquiries',
	'catalog',
	'customers',
	'campaigns',
	'reviews'
];

/**
 * The middle tabs for the mobile bottom bar — up to two enabled primary modules
 * in {@link MOBILE_TAB_ORDER}. «Oversikt» and «Meny» are structural (added by the
 * tab bar itself) and are not returned here. A pure-website tenant (no operational
 * module) falls back to «Nettsted & SEO» so the bar is never just Oversikt/Meny.
 */
export function mobilePrimaryNav(modules: BusinessModules | null | undefined): NavItem[] {
	const middle = MOBILE_TAB_ORDER.filter((key) => Boolean(modules?.[key]))
		.map((key) => NAV.find((item) => item.key === key))
		.filter((item): item is NavItem => item !== undefined)
		.slice(0, 2);
	if (middle.length === 0) {
		const nettsted = NAV.find((item) => item.href === '/nettsted');
		return nettsted ? [nettsted] : [];
	}
	return middle;
}
