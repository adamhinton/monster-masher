import "server-only";

import * as Sentry from "@sentry/nextjs";
import { userProfileSchema } from "@/lib/api/schemas/UserProfile";
import { createClientSSROnly } from "@/lib/supabase/server";
import type { ReduxAuthState } from "../../../store/authSlice";
import { fetchLoggedInDjangoUserProfile } from "../django/fetchFromDjango";

/**Checks if there's a logged-in user on first page load, and fetches their profile info if so */
export async function fetchInitialAuthState(): Promise<ReduxAuthState> {
	const supabase = await createClientSSROnly();

	/**Check if user is logged in */
	const { data, error } = await supabase.auth.getUser();

	/**User not logged in */
	if (error || !data.user) {
		return { status: "anonymous" };
	}

	const { data: sessionData } = await supabase.auth.getSession();
	const accessToken = sessionData.session?.access_token;

	if (!accessToken) {
		return { status: "anonymous" };
	}

	try {
		const loggedInUser = await fetchLoggedInDjangoUserProfile(accessToken);
		const parsed = userProfileSchema.safeParse(loggedInUser);

		if (parsed.success) {
			return {
				status: "authenticated",
				user: parsed.data,
			};
		}

		Sentry.captureMessage("auth.initial_profile_schema_invalid", {
			level: "error",
			tags: {
				feature_area: "auth",
				auth_state: "authenticated",
			},
			extra: {
				issues: parsed.error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
					code: issue.code,
				})),
			},
		});

		return { status: "anonymous" };
	} catch {
		// Validation failure or network error — safe fallback
		return { status: "anonymous" };
	}
}
