import { error } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { pb } from '$lib/pb';
import {
	Collections,
	type AgencyLeadsResponse,
	type AgencyCallSlotsResponse,
	type AgencyMembersResponse,
	type UsersResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

/** A lead with its assigned agency user expanded. */
export type LeadRow = AgencyLeadsResponse<{ assigned_to?: UsersResponse }>;
/** A call slot with its booking lead expanded (present only when status = booked). */
export type CallSlotRow = AgencyCallSlotsResponse<{ lead?: AgencyLeadsResponse }>;
/** An assignable agency person (for the «Ansvarlig» picker). */
export type Person = { id: string; name: string };

/**
 * Load the agency's own inbound leads (contact requests from the byrå website),
 * the shared pool of call slots («Book en prat»), and the assignable agency
 * people (active members → users). Leads newest first; slots by time. Agency-only
 * read (leads createRule is public so the website can post anonymously; slots are
 * publicly readable only when open). A dead server → error(503).
 */
export const load: PageLoad = async ({ fetch }) => {
	const common = { requestKey: null, fetch } as const;
	try {
		const [leads, slots, members] = await Promise.all([
			pb
				.collection(Collections.AgencyLeads)
				.getFullList<LeadRow>({ sort: '-created', expand: 'assigned_to', ...common }),
			pb
				.collection(Collections.AgencyCallSlots)
				.getFullList<CallSlotRow>({ sort: 'starts', expand: 'lead', ...common }),
			pb
				.collection(Collections.AgencyMembers)
				.getFullList<AgencyMembersResponse<{ user?: UsersResponse }>>({
					filter: 'status = "active"',
					expand: 'user',
					...common
				})
		]);
		// De-duplicate to one entry per user (a person could hold several member rows).
		const seen = new Set<string>();
		const people: Person[] = [];
		for (const m of members) {
			const u = m.expand?.user;
			if (u && !seen.has(u.id)) {
				seen.add(u.id);
				people.push({ id: u.id, name: u.name });
			}
		}
		return { leads, slots, people };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
