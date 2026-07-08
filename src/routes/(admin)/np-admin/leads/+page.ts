import { error } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import { Collections, type AgencyLeadsResponse } from '$lib/pocketbase-types';
import type { PageLoad } from './$types';

export type LeadRow = AgencyLeadsResponse;

const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

/**
 * Load the agency's own inbound leads (contact requests from the byrå website).
 * Newest first. Agency-only read (createRule is public so the website can post
 * anonymously). A dead server → error(503) handled by the route's +error.svelte.
 */
export const load: PageLoad = async ({ fetch }) => {
	try {
		const leads = await pb
			.collection(Collections.AgencyLeads)
			.getFullList<LeadRow>({ sort: '-created', requestKey: null, fetch });
		return { leads };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		throw e;
	}
};
