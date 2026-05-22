// _______________
// /api/monsters/
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
import { monsterFormSchema } from "@/components/monsterGeneration/monsterFormSchema";
import { type NextApiError } from "@/lib/api/errors";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import { moderateMonsterPrompt } from "@/lib/monsterGeneration/imageGeneration/moderation/moderation";
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
	return NextResponse.json({ error: { code, message } }, { status });
}

/** POST /api/monsters/ — create a monster via Django, returning the created Monster */
export async function POST(
	request: NextRequest,
): Promise<NextResponse<{ monster: Monster } | NextApiError>> {
	const crossSiteResponse = rejectCrossSiteMutatingRequest(request);
	if (crossSiteResponse) return crossSiteResponse;

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
		scope: "monster-create",
		identifier: claimsData.claims.sub,
		limit: 60,
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

	const monsterData = isValidMonster.data;
	const formValuesForModeration = monsterFormSchema.safeParse({
		display_name: monsterData.display_name,
		element: monsterData.traits.element,
		habitat: monsterData.traits.habitat,
		personality: monsterData.traits.personality,
		color_palette: monsterData.traits.color_palette,
		flavor_text: monsterData.flavor_text ?? "",
		should_email_when_done: false,
	});

	if (!formValuesForModeration.success) {
		return jsonError({
			status: 400,
			code: "invalid_monster_data",
			message:
				"Request body does not match expected monster data structure." +
				formValuesForModeration.error.message,
		});
	}

	const moderationResult = await moderateMonsterPrompt({
		formValues: formValuesForModeration.data,
		userId: claimsData.claims.sub,
		authState: "authenticated",
	});

	if (moderationResult.outcome !== "allowed") {
		return jsonError({
			status: moderationResult.outcome === "failed" ? 500 : 422,
			code: moderationResult.code,
			message: moderationResult.message,
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
