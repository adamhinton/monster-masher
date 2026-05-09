import "server-only";

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

	try {
		const loggedInUser = await fetchLoggedInDjangoUserProfile();
		if (userProfileSchema.safeParse(loggedInUser).success) {
			return {
				status: "authenticated",
				user: loggedInUser,
			};
		} else {
			console.error("Invalid user profile data:", loggedInUser);
			return { status: "anonymous" };
		}
	} catch {
		// Validation failure or network error — safe fallback
		return { status: "anonymous" };
	}
}
