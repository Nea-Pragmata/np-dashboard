import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';
import type { TypedPocketBase } from '$lib/pocketbase-types';

/**
 * Single browser-side PocketBase client.
 *
 * The auth token persists in the SDK's default LocalAuthStore (localStorage in
 * the browser). This module-level instance is intended for CLIENT use — it is
 * deliberately kept OUTSIDE any runes `$state` because wrapping it in a reactive
 * proxy breaks `authStore` change tracking and realtime (SSE) subscriptions.
 *
 * SvelteKit SERVER code (load functions / hooks) must instantiate a fresh
 * PocketBase client per request instead of importing this one — a shared
 * authenticated server instance would bleed auth context across concurrent
 * multi-tenant requests (see docs/LEDGER.md).
 */
export const pb = new PocketBase(PUBLIC_PB_URL) as TypedPocketBase;
