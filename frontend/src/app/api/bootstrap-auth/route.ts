// ____________
// bootstrap-auth calls Django's /api/me/bootstrap endpoint to get the current user's profile information.
// NOTE The user will be already logged in, since Next will have gotten auth from Supabase Auth directly.
// This just gets further profile info.
// ____________

import { NextResponse } from "next/server";

import { UserProfile, userProfileSchema } from "@/lib/api/schemas/UserProfile";
import { createClientSSROnly } from "@/lib/supabase/server";
import { env } from "@/lib/env/env";
import { NextApiError } from "@/lib/api/errors";

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

	// Shouldn't happen since user is already logged in
	if (claimsError || !claimsData!.claims.sub) {
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
	const djangoResponse = await fetch(
		`${env.djangoApiBaseUrl}/api/me/bootstrap/`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/json",
			},
			cache: "no-store",
		},
	);

	if (!djangoResponse.ok) {
		return jsonError({
			status: djangoResponse.status === 401 ? 401 : 502,
			code: "django_bootstrap_failed",
			message: "Could not bootstrap user profile from Django.",
		});
	}

	const raw: unknown = await djangoResponse.json();
	const parsed = userProfileSchema.safeParse(raw);

	if (!parsed.success) {
		return jsonError({
			status: 502,
			code: "invalid_django_user_profile",
			message: "Django returned an invalid user profile.",
		});
	}

	return NextResponse.json({
		user: parsed.data,
	});
}
