import "server-only";

import { userProfileSchema } from "@/lib/api/schemas/UserProfile";
import { createClientSSROnly } from "@/lib/supabase/server";
import type { ReduxAuthState } from "../../../store/authSlice";
import { fetchFromDjango } from "../django/fetchFromDjango";

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
		// User is logged in; get profile info
		const response = await fetchFromDjango("/api/me/bootstrap", {
			method: "POST",
		});

		if (!response.ok) {
			return { status: "anonymous" };
		}

		const raw: unknown = await response.json();
		const user = userProfileSchema.parse(raw);
		return { status: "authenticated", user };
	} catch {
		// Validation failure or network error — safe fallback
		return { status: "anonymous" };
	}
}
