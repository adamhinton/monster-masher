// _______________
// GET /api/me/image-gens-remaining/
//
// Proxies to Django GET /api/me/image-gens-remaining/ to return how many
// image generations the authenticated user has left today (based on env MAX_GENERATIONS_PER_DAY and how many they've already used).
//
// Response shape: { num_remaining: number, max_per_day: number, used_today: number }
// _______________

import "server-only";

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { type NextApiError } from "@/lib/api/errors";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import { type operations } from "@/lib/api/__generated__/types";
import { Assert, AssertExact } from "@/lib/api/type-assertions";
import {
	imageGensRemainingSchema,
	type ImageGensRemaining,
} from "@/lib/api/schemas/ImageGensRemainingSchema";
export type { ImageGensRemaining } from "@/lib/api/schemas/ImageGensRemainingSchema";
export { imageGensRemainingSchema } from "@/lib/api/schemas/ImageGensRemainingSchema";

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

/**Make sure django data matches our data structure
 * This will fail to compile if any type drift happens.
 */
type _FromAPI =
	operations["api_me_image_gens_remaining_retrieve"]["responses"][200]["content"]["application/json"];
// If this fails, you have type drift between the Django response and our Zod schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _SchemaMatchesOpenAPI = Assert<AssertExact<ImageGensRemaining, _FromAPI>>;

export async function GET(): Promise<
	NextResponse<ImageGensRemaining | NextApiError>
> {
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
		djangoResponse = await fetchFromDjango("/api/me/image-gens-remaining/", {
			method: "GET",
			headers: { Authorization: `Bearer ${accessToken}` },
		});
	} catch (err) {
		Sentry.captureException(err);
		return jsonError({
			status: 502,
			code: "upstream_error",
			message: "Could not reach the backend. Please try again.",
		});
	}

	if (!djangoResponse.ok) {
		Sentry.captureMessage(
			`Unexpected Django status for image-gens-remaining: ${djangoResponse.status}`,
		);
		return jsonError({
			status: djangoResponse.status,
			code: "fetch_failed",
			message: "Failed to fetch remaining image generations.",
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

	const parsed = imageGensRemainingSchema.safeParse(raw);
	if (!parsed.success) {
		Sentry.captureMessage("image_gens_remaining.schema_mismatch", {
			level: "error",
			extra: { error: parsed.error.message },
		});
		return jsonError({
			status: 502,
			code: "schema_mismatch",
			message: "Unexpected response shape from backend.",
		});
	}

	return NextResponse.json(parsed.data);
}
