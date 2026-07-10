import { error, redirect } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import { Collections } from '$lib/pocketbase-types';
import {
	availableTabs,
	isFane,
	tabFor,
	type CampaignRow,
	type LinkPageRow,
	type LinkRow,
	type RecipientCounts,
	type SocialPostRow,
	type TemplateRow,
	type AdStatusRow
} from '../marketing';
import type { PageLoad } from './$types';

/** A dead server surfaces as a ClientResponseError with a falsy status. */

/** Redirect target when the requested fane is invalid or module-gated off. */
function fallbackFane(modules: unknown): string {
	const tabs = availableTabs(modules as never);
	return tabs.length ? `/markedsforing/${tabs[0].fane}` : '/oversikt';
}

/** Just the consent flags — keeps the recipient-count query light. */
type ConsentRow = { consents?: { email?: boolean; sms?: boolean } | null };

/**
 * Load the active Markedsføring tab for the current business.
 *
 *  - Validates the `[fane]` segment and redirects unknown values.
 *  - Module-gates each tab (campaigns / links / social / ads) and redirects to
 *    the first tab the tenant can see when the module is off.
 *  - Loads only the data the active tab needs (campaigns + recipient counts for
 *    Kampanjer; link page + links for Lenker; nothing for the not-yet-built
 *    Sosiale medier / Annonser tabs).
 *
 * Parallel reads use `requestKey:null` (no auto-cancel) through SvelteKit's
 * `fetch`; an unreachable server → error(503), handled by +error.svelte.
 */
export const load: PageLoad = async ({ params, parent, fetch }) => {
	const { business, modules } = await parent();
	// The (app) layout guarantees an active business; guard defensively.
	if (!business) error(503, NETWORK_MESSAGE);

	const fane = params.fane;
	if (!isFane(fane)) redirect(307, fallbackFane(modules));

	const tab = tabFor(fane);
	if (!modules?.[tab.module]) redirect(307, fallbackFane(modules));

	const bid = business.id;
	const common = { requestKey: null, fetch } as const;

	try {
		if (fane === 'kampanjer') {
			const [campaigns, consentRows] = await Promise.all([
				pb.collection(Collections.Campaigns).getFullList<CampaignRow>({
					filter: `business = "${bid}"`,
					sort: '-created',
					...common
				}),
				pb.collection(Collections.Customers).getFullList<ConsentRow>({
					filter: `business = "${bid}"`,
					fields: 'id,consents',
					...common
				})
			]);

			// The recipient segment is derived from real customer consents so the
			// "X mottakere" figure in the wizard is honest, not a fixed number.
			const recipients: RecipientCounts = { email: 0, sms: 0 };
			for (const c of consentRows) {
				if (c.consents?.email === true) recipients.email++;
				if (c.consents?.sms === true) recipients.sms++;
			}

			return { fane, campaigns, recipients };
		}

		if (fane === 'lenker') {
			const [linkPages, links] = await Promise.all([
				pb.collection(Collections.LinkPages).getFullList<LinkPageRow>({
					filter: `business = "${bid}"`,
					...common
				}),
				pb.collection(Collections.Links).getFullList<LinkRow>({
					filter: `business = "${bid}"`,
					sort: 'sort_order,created',
					...common
				})
			]);

			return { fane, linkPage: linkPages[0] ?? null, links };
		}

		if (fane === 'sosiale-medier') {
			const [posts, templates] = await Promise.all([
				pb.collection(Collections.SocialPosts).getFullList<SocialPostRow>({
					filter: `business = "${bid}"`,
					sort: 'scheduled_at',
					...common
				}),
				// Social-post templates: this business's own + the agency-global ones
				// (business = "") the byrå maintains for everyone.
				pb.collection(Collections.ContentTemplates).getFullList<TemplateRow>({
					filter: `type = "social_post" && (business = "${bid}" || business = "")`,
					sort: 'name',
					...common
				})
			]);

			return { fane, posts, templates };
		}

		if (fane === 'annonser') {
			// Ad connection status comes from the integration_status VIEW (readable
			// by the customer and the agency alike) — never the integrations config
			// (which holds provider secrets). Only the ad networks are relevant here.
			const adStatuses = await pb
				.collection(Collections.IntegrationStatus)
				.getFullList<AdStatusRow>({
					filter: `business = "${bid}" && (provider = "meta" || provider = "google")`,
					sort: 'provider',
					...common
				});

			return { fane, adStatuses };
		}

		return { fane };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
