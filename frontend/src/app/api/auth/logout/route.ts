// __________
// /app/api/auth/logout

// Call this to log the user out (obviously)
// This clears the supabase auth signed in user
// __________

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { createClientSSROnly } from "@/lib/supabase/server";
import { NextApiError } from "@/lib/api/errors";

type LogoutResponse = { ok: true } | NextApiError;

/**Logs the user out via supabase auth
 * Don't need to call redux logout action; AuthWatcher will (should) handle that for us and propagate the change to global state
 */
export async function POST(): Promise<NextResponse<LogoutResponse>> {
	const supabase = await createClientSSROnly();

	// Log out user from supabase auth
	// If successful, AuthWatcher should detect and propagate the change to redux state
	const { error } = await supabase.auth.signOut();

	if (error) {
		// Won't compile if the route path drifts
		const logoutRoute = "/api/auth/logout";

		Sentry.captureMessage("auth.logout_failed", {
			level: "warning",
			tags: {
				feature_area: "auth",
				route: logoutRoute,
			},
			extra: {
				supabaseErrorCode: error.code,
				supabaseErrorName: error.name,
			},
		});

		return NextResponse.json<LogoutResponse>(
			{
				error: {
					code: "logout_failed",
					message: "Could not log out. Please try again.",
				},
			},
			{ status: 500 },
		);
	}

	return NextResponse.json<LogoutResponse>({ ok: true });
}
