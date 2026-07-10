import { ClientResponseError } from 'pocketbase';

/** Bokmål message for a request that never reached PocketBase (used by `+page.ts` loads). */
export const NETWORK_MESSAGE = 'Får ikke kontakt med serveren';

/** True when the error is a PocketBase request that never reached the server (status 0). */
export function isNetworkError(e: unknown): boolean {
	return e instanceof ClientResponseError && !e.status;
}

const NETWORK = NETWORK_MESSAGE;
const FORBIDDEN = 'Du har ikke tilgang';
const NOT_FOUND = 'Fant ikke innholdet';
const GENERIC = 'Noe gikk galt. Prøv igjen.';

/** Pull the first field-level validation message out of a 400 response. */
function firstFieldMessage(e: ClientResponseError): string | null {
	const fields = e.response?.data as
		| Record<string, { message?: string } | undefined>
		| undefined;
	if (!fields) return null;
	for (const key of Object.keys(fields)) {
		const msg = fields[key]?.message;
		if (msg) return msg;
	}
	return null;
}

/**
 * Map any thrown error to a Norwegian bokmål message fit for the UI.
 *
 * Aborted requests (e.g. superseded loads) return an empty string — callers
 * should treat "" as "nothing to show" and skip rendering a message.
 */
export function pbError(e: unknown): string {
	if (e instanceof ClientResponseError) {
		if (e.isAbort) return '';
		// status 0 (and any falsy status) means the request never reached PB.
		if (!e.status) return NETWORK;
		switch (e.status) {
			case 400:
				return firstFieldMessage(e) ?? (e.message || GENERIC);
			case 403:
				return FORBIDDEN;
			case 404:
				return NOT_FOUND;
			default:
				return e.message || GENERIC;
		}
	}
	if (e instanceof Error) return e.message || GENERIC;
	return GENERIC;
}
