// _______________
// /api/monsters/

// TODO right now, a monster can get made with no image if the image gen job fails. Need a way to handle that gracefully
//
// Proxies monster creation to Django. Reads the Supabase session server-side
// to get the access token, then forwards the JSON body to Django.
// _______________

import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import {
	MonsterForPOSTSchema,
	MonsterSchema,
	type Monster,
} from "@/lib/api/schemas/monster/MonsterSchema";
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
	return NextResponse.json({ error: { code, message } }, { status });
}

/** POST /api/monsters/ — create a monster via Django, returning the created Monster */
export async function POST(
	request: NextRequest,
): Promise<NextResponse<{ monster: Monster } | NextApiError>> {
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

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonError({
			status: 400,
			code: "invalid_json",
			message: "Request body must be valid JSON.",
		});
	}

	// Validate that it's the structure that Django expects
	// Should never fail since the form also validates this before sending to this route handler
	const isValidMonster = MonsterForPOSTSchema.safeParse(body);
	if (!isValidMonster.success) {
		return jsonError({
			status: 400,
			code: "invalid_monster_data",
			message:
				"Request body does not match expected monster data structure." +
				isValidMonster.error.message,
		});
	}

	let djangoResponse: Response;
	try {
		djangoResponse = await fetchFromDjango("/api/monsters/", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		Sentry.captureException(error, {
			tags: { feature_area: "monsters", route: "/api/monsters/" },
		});
		return jsonError({
			status: 503,
			code: "upstream_error",
			message: "Could not reach the server. Please try again.",
		});
	}

	const raw: unknown = await djangoResponse.json();

	if (!djangoResponse.ok) {
		Sentry.captureMessage("monsters.create_failed", {
			level: "warning",
			tags: { feature_area: "monsters" },
			extra: { status: djangoResponse.status },
		});
		return jsonError({
			status: djangoResponse.status,
			code: "django_error",
			message: "Failed to create monster.",
		});
	}

	const parsed = MonsterSchema.safeParse(raw);
	if (!parsed.success) {
		Sentry.captureMessage("monsters.create_schema_mismatch", {
			level: "error",
			tags: { feature_area: "monsters" },
		});
		return jsonError({
			status: 500,
			code: "schema_mismatch",
			message: "Unexpected response from server.",
		});
	}

	return NextResponse.json({ monster: parsed.data }, { status: 201 });
}
