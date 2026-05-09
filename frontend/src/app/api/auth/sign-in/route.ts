// ____________
// Signin Flow:

// 1. User submits email to this endpoint to sign in
// 2. Supabase sends a magic signin link to user
// 3. User clicks link, which goes to /api/auth/callback, finishing the signin process
// 4. AuthWatcher component detects the user is signed in, gets their profile info from Django
// and propagates it to redux state
// 5. User is redirected to "next" path, probably /gallery
// TODO magic link email sends user to prod in development. Make sure it sends to localhost in dev

// TODO make sure user can stay signed in, would be annoying to have to do this every page visit
// ____________

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSafeNextPath } from "@/lib/auth/redirects";
import { createClientSSROnly } from "@/lib/supabase/server";
import { NextApiError } from "@/lib/api/errors";

const signInRequestSchema = z.object({
	email: z.email().trim().toLowerCase(),
	// Redirect path after sign-in. Optional, defaults to "/". Validated later by getSafeNextPath util
	next: z.string().optional(),
});

type SignInResponse = { ok: true } | NextApiError;

/**Call this from the browser to sign a user in by email magic link
 *
 * This will trigger Supabase Auth to send a magic link email to the user. The link will redirect to /api/auth/callback, which will finish the sign-in process and then redirect to the "next" path (which defaults to "/").
 *
 * TODO write a client-side util that calls this for us
 */
export async function POST(
	// Use SignInRequestSchema. email and optional "next" path to redirect after signin. Probably /gallery
	request: NextRequest,
): Promise<NextResponse<SignInResponse>> {
	let raw: unknown;

	try {
		raw = await request.json();
	} catch {
		return NextResponse.json<SignInResponse>(
			{ error: { code: "invalid_json", message: "Invalid request." } },
			{ status: 400 },
		);
	}

	const parsed = signInRequestSchema.safeParse(raw);

	if (!parsed.success) {
		return NextResponse.json<SignInResponse>(
			{ error: { code: "invalid_request", message: "Enter a valid email." } },
			{ status: 400 },
		);
	}

	const { email, next: rawNext } = parsed.data;
	/**Redirect route after successful sign-in */
	const next = getSafeNextPath(rawNext ?? null);

	const origin = request.nextUrl.origin;
	console.log("origin:", origin);
	const supabase = await createClientSSROnly();

	// Here we send the user a magic link email to sign in
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
		},
	});

	if (error) {
		return NextResponse.json<SignInResponse>(
			{
				error: {
					code: "sign_in_failed",
					message: "Could not send sign-in link. Please try again.",
				},
			},
			{ status: 400 },
		);
	}

	// Signin successful; user redirected to "next" link, probably /gallery
	// Here the AuthWatcher component will (should) detect the signin, get additional profile data from the db and propagate their info to redux state. TODO make sure that all works smoothly
	return NextResponse.json<SignInResponse>({ ok: true });
}
