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
