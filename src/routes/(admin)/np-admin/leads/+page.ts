import { error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type AgencyLeadsResponse,
	type AgencyCallSlotsResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

export type LeadRow = AgencyLeadsResponse;
/** A call slot with its booking lead expanded (present only when status = booked). */
export type CallSlotRow = AgencyCallSlotsResponse<{ lead?: AgencyLeadsResponse }>;

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load the agency's own inbound leads (contact requests from the byrå website)
 * and the shared pool of call slots («Book en prat»). Leads newest first; slots
 * by time. Agency-only read (leads createRule is public so the website can post
 * anonymously; slots are publicly readable only when open). A dead server →
 * error(503) handled by the route's +error.svelte.
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [leads, slots] = await Promise.all([
			pb.collection(Collections.AgencyLeads).getFullList<LeadRow>({ sort: '-created', ...common }),
			pb
				.collection(Collections.AgencyCallSlots)
				.getFullList<CallSlotRow>({ sort: 'starts', expand: 'lead', ...common })
		]);
		return { leads, slots };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
