import "server-only";

/**
 * SSR-safe fetch utility for Django API endpoints.
 * Sends only explicitly provided request headers.
 * Usage: fetchFromDjango("/api/endpoint", { method: "POST", body: ... })
 */
import { env } from "../env/env";
import { UserProfile, userProfileSchema } from "../api/schemas/UserProfile";

/**
 * Fetch from Django backend, forwarding cookies and headers for SSR.
 * @param path Django API path (e.g. "/api/me/bootstrap")
 * @param init Fetch options (method, body, etc)
 */
export async function fetchFromDjango(
	path: string,
	init?: RequestInit,
): Promise<Response> {
	const url = `${env.djangoApiBaseUrl}${path}`;

	return fetch(url, {
		...init,
		headers: init?.headers,
	});
}

/**
 * Gets profile info for the currently logged-in user from Django.
 *
 * This is meant to be called from the client so as not to expose our API endpoints.
 *
 * Returns the validated UserProfile.
 * Throws specific errors for network issues, response errors, or validation failures.
 *
 * Note that the user is logged in through Supabase Auth already, but that only gives us their email and supabase id. Django now gives us their username, display name, and eventually monsters when we add that.
 */
export async function fetchLoggedInDjangoUserProfile(
	accessToken: string,
): Promise<UserProfile> {
	try {
		const response = await fetchFromDjango("/api/me/bootstrap/", {
			method: "POST",
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch profile. Status: ${response.status}`);
		}

		const raw: unknown = await response.json();

		try {
			return userProfileSchema.parse(raw);
		} catch (validationError) {
			throw new Error(
				`Profile validation failed: ${validationError instanceof Error ? validationError.message : validationError}`,
			);
		}
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error("Failed to parse response JSON.");
		} else if (error instanceof TypeError) {
			throw new Error("Network error or request failed.");
		} else {
			throw new Error(
				`Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
