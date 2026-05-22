// _______________
// /api/monsters/[monsterId]/
//
// Proxies monster mutation requests to Django.
// GET  — fetch a single monster owned by the authenticated user.
// DELETE — permanently removes the monster owned by the authenticated user.

// TODO better PATCH flow (or any patch flow) - complications with regenerating images.
// _______________

import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { type NextApiError } from "@/lib/api/errors";
import {
	MonsterSchema,
	type Monster,
} from "@/lib/api/schemas/monster/MonsterSchema";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import { rejectCrossSiteMutatingRequest } from "@/lib/security/requestGuards";
import {
	checkRateLimit,
	rateLimitExceededResponse,
} from "@/lib/security/rateLimit";

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

/** GET /api/monsters/[monsterId] — fetch a single monster from Django */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ monsterId: Monster["id"] }> },
): Promise<NextResponse<{ monster: Monster } | NextApiError>> {
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

	let djangoResponse: Response;
	try {
		djangoResponse = await fetchFromDjango(
			"/api/monsters/{monster_id}/",
			{ monster_id: monsterId },
			{
				method: "GET",
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

	if (djangoResponse.status === 404) {
		return jsonError({
			status: 404,
			code: "not_found",
			message: "Monster not found.",
		});
	}

	if (!djangoResponse.ok) {
		Sentry.captureMessage(
			`Unexpected Django GET monster status: ${djangoResponse.status}`,
		);
		return jsonError({
			status: djangoResponse.status,
			code: "fetch_failed",
			message: "Failed to fetch monster.",
		});
	}

	let raw: unknown;
	try {
		raw = await djangoResponse.json();
	} catch {
		return jsonError({
			status: 502,
			code: "invalid_response",
			message: "Backend returned invalid JSON.",
		});
	}

	const parsed = MonsterSchema.safeParse(raw);
	if (!parsed.success) {
		Sentry.captureMessage("get_monster.schema_mismatch", {
			level: "error",
			extra: { monsterId, error: parsed.error.message },
		});
		return jsonError({
			status: 502,
			code: "schema_mismatch",
			message: "Unexpected response shape from backend.",
		});
	}

	return NextResponse.json({ monster: parsed.data });
}

/** DELETE /api/monsters/[monsterId] — delete a monster via Django */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ monsterId: string }> },
): Promise<NextResponse<{ ok: true } | NextApiError>> {
	const crossSiteResponse = rejectCrossSiteMutatingRequest(request);
	if (crossSiteResponse) return crossSiteResponse;

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

	const rateLimit = checkRateLimit({
		scope: "monster-delete",
		identifier: claimsData.claims.sub,
		limit: 30,
		windowMs: 60 * 60 * 1000,
	});
	if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

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
