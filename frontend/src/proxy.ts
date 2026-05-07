import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// Validates the JWT and refreshes the session if expired.
	// getClaims() verifies signature against Supabase's public keys — required for SSR.
	// Do not add any logic between createServerClient and getClaims.
	await supabase.auth.getClaims();

	return supabaseResponse;
}

export const config = {
	matcher: [
		// Run proxy on all routes except static files and _next internals.
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
