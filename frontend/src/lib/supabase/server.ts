import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client. Use in Server Components, Server Actions,
 * and Route Handlers. Never import this from a Client Component.
 */
export async function createClientSSROnly() {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						);
					} catch {
						// setAll is called from a Server Component where cookies cannot be set.
						// This is expected when reading session in a Server Component — ignore.
					}
				},
			},
		},
	);
}
