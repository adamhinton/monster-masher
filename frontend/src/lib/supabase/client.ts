// `createClientCSROnly()` may be used for:

// - `AuthWatcher`
// - highly limited client auth UX needs
// - safe Supabase auth listener usage

// Avoid using it for the sign-in form if the form can call a Next route handler instead.

// Never use it for:

// - Django API calls
// - service role access
// - privileged storage writes
// - app data writes
// - token extraction for app logic

import "client-only";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use this in Client Components only.
 *
 * For Server Components, Server Actions, and Route Handlers, use createClientSSROnly from server.ts instead.
 */
export function createClientCSROnly() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
	);
}
