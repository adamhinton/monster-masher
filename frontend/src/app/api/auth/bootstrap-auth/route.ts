// ____________
// POST /api/auth/bootstrap-auth
// Verifies the Supabase session, forwards the access token to Django,
// and returns the app-level user profile.
// NOTE The user will be already logged in, since Next will have gotten auth from Supabase Auth directly.
// This just gets further profile info.
// ____________

import { NextResponse } from "next/server";

import { UserProfile, userProfileSchema } from "@/lib/api/schemas/UserProfile";
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
 * Get user profile info from Django
 *
 * Doesn't take any parameters because Supabase Auth detects which user is logged-in, and gets info for that user.
 *
 * User is already logged in via supabase auth but that only gives us their email and ID; this just gets further info about their profile.
 *
 * Eventually this will also return their Monsters and any other info, but we haven't written that yet as of 5.8.26.
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

	const user = await fetchLoggedInDjangoUserProfile().catch((error) => {
		console.error("Error fetching user profile from Django:", error);
		return jsonError({
			status: 500,
			code: "django_fetch_failed",
			message: "Failed to fetch user profile from Django.",
		});
	});

	// Shouldn't happen since fetchLoggedInDjangoUserProfile should have already parsed
	if (!isValidUser(user)) {
		return jsonError({
			status: 500,
			code: "invalid_user_profile",
			message: "Received invalid user profile from Django.",
		});
	}

	return NextResponse.json({ user: user });
}

const isValidUser = (user: unknown): user is UserProfile => {
	const validationResult = userProfileSchema.safeParse(user);
	if (!validationResult.success) {
		console.error("User profile validation failed:", validationResult.error);
		return false;
	}
	return true;
};
