/**
 * Auth callback endpoint
 *
 * User logs in by clicking a magic link email. They're then redirected to this endpoint by supabase, which verifies the login and then redirects them to the app.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getSafeNextPath } from "@/lib/auth/redirects";
import { createClientSSROnly } from "@/lib/supabase/server";

/**
 * Magic link login redirects here.
 *
 * This endpoint verifies the login with Supabase Auth, then redirects to the app.
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const next = getSafeNextPath(requestUrl.searchParams.get("next"));

	if (!code) {
		return NextResponse.redirect(
			new URL("/auth?error=missing_code", request.url),
		);
	}

	const supabase = await createClientSSROnly();

	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		return NextResponse.redirect(
			new URL("/auth?error=callback_failed", request.url),
		);
	}

	return NextResponse.redirect(new URL(next, request.url));
}
