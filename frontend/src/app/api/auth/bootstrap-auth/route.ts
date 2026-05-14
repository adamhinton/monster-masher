// ____________
// POST /api/auth/bootstrap-auth
// Verifies the Supabase session, forwards the access token to Django's
// POST /api/me/bootstrap/ endpoint, and returns the full UserProfileWithMonsters
// payload — profile fields + saved monsters with images — so the frontend can
// hydrate global auth + monster state in a single round-trip.
// NOTE The user is already logged in via Supabase Auth at this point; this
// just fetches the deeper app-level profile and monster data from Django.
// ____________

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { UserProfile } from "@/lib/api/schemas/UserProfileSchema";
import { createClientSSROnly } from "@/lib/supabase/server";
import { NextApiError } from "@/lib/api/errors";
import { fetchLoggedInDjangoUserProfile } from "@/lib/django/fetchFromDjango";

export const dynamic = "force-dynamic";

function jsonError({
	status,
	code,
	message,
}: {
	status: number;
	code: string;
	message: string;
}) {
	return NextResponse.json(
		{
			error: {
				code,
				message,
			},
		},
		{ status },
	);
}

/**
 * Fetch full profile + monsters from Django and return to the client.
 *
 * Validates the Supabase session, then calls Django's POST /api/me/bootstrap/
 * with the access token.  Django returns a UserProfileWithMonsters payload
 * (profile fields + all saved monsters, each with their most recent image or null).
 *
 * The response is parsed through userProfileSchema for runtime validation before
 * being returned, so malformed Django responses are caught at this boundary.
 */
export async function POST(): Promise<
	NextResponse<{ user: UserProfile } | NextApiError>
> {
	const supabase = await createClientSSROnly();

	// User should already be logged in, this just verifies it
	const { data: claimsData, error: claimsError } =
		await supabase.auth.getClaims();

	if (claimsError || !claimsData?.claims.sub) {
		return jsonError({
			status: 401,
			code: "not_authenticated",
			message: "User is not authenticated.",
		});
	}

	// After verification, use the session only to get the access token to forward to Django.
	const { data: sessionData, error: sessionError } =
		await supabase.auth.getSession();

	const accessToken = sessionData.session?.access_token;

	if (sessionError || !accessToken) {
		return jsonError({
			status: 401,
			code: "missing_access_token",
			message: "Could not read Supabase access token.",
		});
	}

	// Get db profile info of logged-in user
	// Supabase auth has only given us their email and id; this gets further info about their profile from Django, which is where our main user database lives.

	let user: UserProfile;
	try {
		user = await fetchLoggedInDjangoUserProfile(accessToken);
	} catch (error) {
		Sentry.captureException(error, {
			tags: {
				feature_area: "auth",
				route: "/api/auth/bootstrap-auth",
				upstream: "django",
			},
			extra: {
				errorName: error instanceof Error ? error.name : "unknown",
			},
		});

		return jsonError({
			status: 500,
			code: "django_fetch_failed",
			message: "Failed to fetch user profile from Django.",
		});
	}

	return NextResponse.json({ user: user });
}
