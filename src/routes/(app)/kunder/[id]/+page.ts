import { error, redirect } from '@sveltejs/kit';
import { isNetworkError, NETWORK_MESSAGE } from '$lib/utils/errors';
import { ClientResponseError } from 'pocketbase';
import { pb } from '$lib/pb';
import {
	Collections,
	type BookingsResponse,
	type InquiriesResponse,
	type ProductsResponse
} from '$lib/pocketbase-types';
import type { PageLoad } from './$types';
import type { CustomerRow } from '../+page';

const NOT_FOUND_MESSAGE = 'Fant ikke kunden';

/** A booking with its product expanded (for the history detail + amount). */
export type CustomerBooking = BookingsResponse<{ product?: ProductsResponse }>;

/**
 * Load one customer's «kundekort»: the customer record plus its related bookings
 * and inquiries (the Historikk + Kommende avtale). Both relations are gated on
 * the tenant actually having that module, so we never fire a pointless read.
 *
 * A missing / other-tenant id → 404 (PocketBase enforces tenant isolation via
 * the list/view rule); a dead server → 503. Both render +error.svelte.
 */
export const load: PageLoad = async ({ params, parent, depends, fetch }) => {
	depends('app:customer');

	const { business, modules } = await parent();
	if (!business) error(503, NETWORK_MESSAGE);
	if (!modules?.customers) redirect(302, '/oversikt');

	const common = { requestKey: null, fetch } as const;

	try {
		const customer = await pb
			.collection(Collections.Customers)
			.getOne<CustomerRow>(params.id, common);

		// Defensive tenant guard on top of the API rule.
		if (customer.business !== business.id) error(404, NOT_FOUND_MESSAGE);

		const [bookings, inquiries] = await Promise.all([
			modules.booking
				? pb.collection(Collections.Bookings).getFullList<CustomerBooking>({
						filter: `customer = "${params.id}"`,
						expand: 'product',
						sort: '-start',
						...common
					})
				: Promise.resolve([] as CustomerBooking[]),
			modules.inquiries
				? pb.collection(Collections.Inquiries).getFullList<InquiriesResponse>({
						filter: `customer = "${params.id}"`,
						sort: '-created',
						...common
					})
				: Promise.resolve([] as InquiriesResponse[])
		]);

		return { customer, bookings, inquiries };
	} catch (e) {
		if (isNetworkError(e)) error(503, NETWORK_MESSAGE);
		if (e instanceof ClientResponseError && e.status === 404) error(404, NOT_FOUND_MESSAGE);
		throw e;
	}
};
