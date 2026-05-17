// _______________
// /api/monsters/[monsterId]/
//
// Proxies monster mutation requests to Django.
// DELETE — permanently removes the monster owned by the authenticated user.

// TODO better PATCH flow (or any patch flow) - complications with regenerating images.
// _______________

import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { type NextApiError } from "@/lib/api/errors";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";

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
	return NextResponse.json<NextApiError>(
		{ error: { code, message } },
		{ status },
	);
}

/** DELETE /api/monsters/[monsterId] — delete a monster via Django */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ monsterId: string }> },
): Promise<NextResponse<{ ok: true } | NextApiError>> {
	const { monsterId } = await params;

	const supabase = await createClientSSROnly();

	const { data: claimsData, error: claimsError } =
		await supabase.auth.getClaims();

	if (claimsError || !claimsData?.claims.sub) {
		return jsonError({
			status: 401,
			code: "not_authenticated",
			message: "User is not authenticated.",
		});
	}

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

	let response: Response;
	try {
		response = await fetchFromDjango(
			"/api/monsters/{monster_id}/",
			{ monster_id: monsterId },
			{
				method: "DELETE",
				headers: { Authorization: `Bearer ${accessToken}` },
			},
		);
	} catch (err) {
		Sentry.captureException(err);
		return jsonError({
			status: 502,
			code: "upstream_error",
			message: "Could not reach the backend. Please try again.",
		});
	}

	if (response.status === 204 || response.ok) {
		return NextResponse.json({ ok: true });
	}

	if (response.status === 404) {
		return jsonError({
			status: 404,
			code: "not_found",
			message: "Monster not found.",
		});
	}

	if (response.status === 403) {
		return jsonError({
			status: 403,
			code: "forbidden",
			message: "You do not have permission to delete this monster.",
		});
	}

	Sentry.captureMessage(`Unexpected Django DELETE status: ${response.status}`);
	return jsonError({
		status: response.status,
		code: "delete_failed",
		message: "Failed to delete monster.",
	});
}
