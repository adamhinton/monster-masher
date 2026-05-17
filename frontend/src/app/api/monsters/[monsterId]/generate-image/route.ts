// TODO IMPORTANT: More robust and secure prompt-building; there's a step for this in our build plan but I'm including it here too because it's important

// ______________
// POST /api/monsters/[monsterId]/generate-image/
//
// Server-side route that orchestrates the full image-generation pipeline for an
// existing Monster. This is the only way to create a MonsterImage — there is no
// separate /api/monster-images/ endpoint. Generation and persistence are
// intentionally coupled here so the job record is always the source of truth.
//
// Pipeline order:
//   1. Authenticate the user via Supabase session. user_profile_id always comes
//      from the verified JWT sub — never from the request body.
//   2. Validate the request body against monsterFormSchema (server-side re-validation).
//   3. Create a MonsterImageGenerationJob in Django (status: QUEUED).
//   4. Run a banned-terms guard; if blocked → mark job blocked → 422.
//   5. Run the moderation provider; if blocked → mark job blocked → 422.
//      If moderation fails → mark job failed → 500.
//   6. Mark the job as RUNNING.
//   7. Generate the image via the image provider; if failed → mark job failed → 500.
//   8. Upload the image bytes to Supabase Storage; if failed → mark job failed → 500.
//   9. Call Django mark-succeeded with the image metadata (Django creates the
//      MonsterImage row and transitions the job to SUCCEEDED).
//  10. Return the public image URL and storage path to the client.
//
// NOTE: Sentry is NOT called for blocked prompts (expected content policy signal).
// Sentry IS called for all failure paths (provider errors, storage errors, etc.).
//
// Trust boundary: Next.js forwards the user's Supabase access
// token to Django for all transition endpoints. Django verifies ownership of both
// the monster and the job before allowing any state mutation.
// ______________

import "server-only";

import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import {
	monsterFormSchema,
	type MonsterFormValues,
} from "@/components/monsterGeneration/monsterFormSchema";
import { type NextApiError } from "@/lib/api/errors";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import { env } from "@/lib/env/env";
import {
	containsBannedTerms,
	getModerationProvider,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderation";
import { getImageProvider } from "@/lib/monsterGeneration/imageGeneration/providers/providers";
import {
	getImageStorage,
	type MonsterImageStoragePath,
} from "@/lib/monsterGeneration/imageGeneration/storage/storage";
import {
	MonsterImageGenJob,
	Queued_Monster_Image_Gen_Job_Schema,
} from "@/lib/api/schemas/monster/Monster_Image_Gen_Job_Schema";
import { type paths } from "@/lib/api/__generated__/types";
import { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

export const dynamic = "force-dynamic";

// ─── Response types ───────────────────────────────────────────────────────────

/**
 * Shape returned on successful image generation.
 *
 * The client should refetch the Monster from Django to hydrate the full
 * MonsterImage record once Step B6 implements mark-succeeded — until then,
 * the public_image_url can be used to display the result immediately.
 */
export type GenerateImageSuccessResponse = {
	outcome: "succeeded";
	/** Public URL of the generated image in Supabase Storage. */
	public_image_url: string;
	/** Typed storage path from the storage abstraction. */
	image_storage_path: MonsterImageStoragePath;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/**
 * Builds the image-generation prompt from the validated form values.
 *
 * Constructed server-side so the user cannot inject arbitrary prompt text that
 * bypasses field-level validation. Fields are assembled in a stable order so
 * identical form values always produce the same prompt string.
 */
function buildPrompt(formValues: MonsterFormValues): string {
	const parts = [
		`Monster name: ${formValues.display_name}`,
		`Element: ${formValues.element}`,
		`Habitat: ${formValues.habitat}`,
		`Personality: ${formValues.personality}`,
		`Color palette: ${formValues.color_palette}`,
	];
	if (formValues.flavor_text) {
		parts.push(`Description: ${formValues.flavor_text}`);
	}
	return parts.join(". ");
}

/**
 * Calls a Django job-transition endpoint (mark-running, mark-succeeded,
 * mark-failed, mark-blocked).
 *
 * The transition endpoints live at:
 *   POST /api/monsters/{monster_id}/generate-image/{action}/
 *
 * The action is constrained to the `TransitionAction` type, which is derived
 * directly from the generated `paths` keys so TypeScript enforces that only
 * known actions are used. job_id is always included in the request body.
 *
 * This function never throws; failures are always handled gracefully so the
 * outer route handler can make its own success/error decision.
 */

/**
 * All path keys in the generated types that match the transition URL pattern.
 * Used to constrain callers to only known transition actions.
 */
type TransitionPathKey = Extract<
	keyof paths,
	`/api/monsters/{monster_id}/generate-image/mark-${string}/`
>;

/**
 * Calls a Django job-transition endpoint (mark-running, mark-succeeded,
 * mark-failed, mark-blocked).
 *
 * Validates that the path is one of the known transition endpoints via the `TransitionPathKey` based on openAPI-generated endpoint path schema. This is to handle dynamic URLs with monsterid params.
 *
 * This function never throws; failures are handled gracefully so the outer
 * route handler can make its own success/error decision.
 */
async function callTransitionEndpoint(
	path: TransitionPathKey,
	pathParams: { monster_id: Monster["id"] },
	jobId: MonsterImageGenJob["id"],
	accessToken: string,
	additionalBody?: Record<string, unknown>,
): Promise<void> {
	try {
		const res = await fetchFromDjango(path, pathParams, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ job_id: jobId, ...additionalBody }),
		});

		if (!res.ok) {
			Sentry.captureMessage("generate_image.transition_endpoint_failed", {
				level: "warning",
				extra: { path, status: res.status },
			});
		}
	} catch {
		Sentry.captureMessage("generate_image.transition_endpoint_error", {
			level: "warning",
			extra: { path },
		});
	}
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/monsters/[monsterId]/generate-image
 *
 * Orchestrates the full image-generation pipeline for an existing Monster.
 * This is the only endpoint that creates MonsterImage records — there is no
 * standalone /api/monster-images/ endpoint. See the file-level comment for
 * the full step-by-step flow.
 *
 * The Monster identified by [monsterId] must already exist in Django. Creating
 * the Monster and generating its first image are separate steps by design — this
 * keeps the generation pipeline independent of the Monster create flow.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ monsterId: string }> },
): Promise<NextResponse<GenerateImageSuccessResponse | NextApiError>> {
	const { monsterId } = await params;
	const generationMode = env.imageGenerationMode;

	// ── Step 1: Verify Supabase session ───────────────────────────────────────
	//
	// NOTE: There is no anonymous or fake-user mode for this endpoint. A real
	// authenticated session is always required so the generated image can be
	// tied to the correct Monster and UserProfile in Django.
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

	// user_profile_id is derived from the verified JWT sub — never from the request body.
	// The Supabase auth UUID (sub) is used here as the storage-path user segment;
	// it corresponds to UserProfile.supabase_user_id in Django.
	const userProfileId = claimsData.claims.sub;

	// ── Step 2: Parse and validate request body ───────────────────────────────
	//
	// Re-validating server-side with the same schema the form uses. Should rarely
	// fail in practice (the form validates too), but closes the gap for direct API
	// calls and provides a clear 400 if the contract drifts.
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

	const parsedBody = monsterFormSchema.safeParse(body);
	if (!parsedBody.success) {
		return jsonError({
			status: 400,
			code: "invalid_request",
			message: "Invalid request body: " + parsedBody.error.message,
		});
	}

	const formValues = parsedBody.data;
	const prompt = buildPrompt(formValues);

	// ── Step 3: Create MonsterImageGenerationJob in Django (QUEUED) ──────────
	let jobId: string;
	try {
		const jobResponse = await fetchFromDjango(
			"/api/monsters/{monster_id}/generate-image/jobs/",
			{ monster_id: monsterId },
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					should_email_when_done: formValues.should_email_when_done,
				}),
			},
		);

		if (!jobResponse.ok) {
			Sentry.captureEvent({
				message: "generate_image.job_create_failed",
				level: "error",
				tags: {
					generation_mode: generationMode,
					error_code: "job_create_failed",
				},
				extra: { status: jobResponse.status },
			});
			return jsonError({
				status: 500,
				code: "job_create_failed",
				message: "Failed to create image generation job.",
			});
		}

		const jobRaw: unknown = await jobResponse.json();
		const jobParsed = Queued_Monster_Image_Gen_Job_Schema.safeParse(jobRaw);
		if (!jobParsed.success) {
			Sentry.captureEvent({
				message: "generate_image.job_schema_mismatch",
				level: "error",
				tags: {
					generation_mode: generationMode,
					error_code: "schema_mismatch",
				},
			});
			return jsonError({
				status: 500,
				code: "schema_mismatch",
				message: "Unexpected response from server.",
			});
		}

		jobId = jobParsed.data.id;
	} catch {
		Sentry.captureEvent({
			message: "generate_image.job_create_error",
			level: "error",
			tags: { generation_mode: generationMode, error_code: "upstream_error" },
		});
		return jsonError({
			status: 500,
			code: "upstream_error",
			message: "Could not reach the server. Please try again.",
		});
	}

	// ── Step 4: Banned-terms guard (fast path before any external calls) ──────

	if (containsBannedTerms(prompt)) {
		await callTransitionEndpoint(
			"/api/monsters/{monster_id}/generate-image/mark-blocked/",
			{ monster_id: monsterId },
			jobId,
			accessToken,
			{
				error_code: "banned_terms",
				error_message: "Prompt contains banned terms.",
			},
		);
		return jsonError({
			status: 422,
			code: "content_blocked",
			message:
				"Prompt contains prohibited content. Please revise and try again.",
		});
	}

	// ── Step 5: Moderation provider check ─────────────────────────────────────
	const moderationResult = await getModerationProvider().moderate(prompt);

	if (moderationResult.outcome === "blocked") {
		await callTransitionEndpoint(
			"/api/monsters/{monster_id}/generate-image/mark-blocked/",
			{ monster_id: monsterId },
			jobId,
			accessToken,
			{
				error_code: "moderation_blocked",
				error_message: moderationResult.safeReason,
			},
		);
		return jsonError({
			status: 422,
			code: "content_blocked",
			message: moderationResult.safeReason,
		});
	}

	if (moderationResult.outcome === "failed") {
		await callTransitionEndpoint(
			"/api/monsters/{monster_id}/generate-image/mark-failed/",
			{ monster_id: monsterId },
			jobId,
			accessToken,
			{
				error_code: "moderation_failed",
				error_message: "Moderation check failed.",
			},
		);
		Sentry.captureEvent({
			message: "generate_image.moderation_failed",
			level: "error",
			tags: {
				generation_mode: generationMode,
				error_code: "moderation_failed",
			},
		});
		return jsonError({
			status: 500,
			code: "moderation_failed",
			message: "Content moderation check failed. Please try again.",
		});
	}

	// ── Step 6: Mark job as RUNNING ───────────────────────────────────────────
	//
	// Job transitions to RUNNING only after moderation passes, meaning a job in
	// RUNNING state always has a clean prompt.
	await callTransitionEndpoint(
		"/api/monsters/{monster_id}/generate-image/mark-running/",
		{ monster_id: monsterId },
		jobId,
		accessToken,
	);

	// ── Step 7: Generate image ────────────────────────────────────────────────
	const imageResult = await getImageProvider().generate(prompt);

	if (imageResult.outcome === "failed") {
		await callTransitionEndpoint(
			"/api/monsters/{monster_id}/generate-image/mark-failed/",
			{ monster_id: monsterId },
			jobId,
			accessToken,
			{
				error_code: "provider_failed",
				error_message: imageResult.safeErrorMessage,
			},
		);
		Sentry.captureEvent({
			message: "generate_image.provider_failed",
			level: "error",
			tags: { generation_mode: generationMode, error_code: "provider_failed" },
		});
		return jsonError({
			status: 500,
			code: "provider_failed",
			message: "Image generation failed. Please try again.",
		});
	}

	// ── Step 8: Upload image to Supabase Storage ──────────────────────────────
	//
	// A UUID is pre-generated for the MonsterImage record. This ID is passed to
	// mark-succeeded (Step 9) so Django can create the MonsterImage with a
	// consistent ID that matches the storage path once B6 is implemented.
	const monsterImageId = crypto.randomUUID();

	const storageResult = await getImageStorage().upload(imageResult.imageBytes, {
		user_profile_id: userProfileId,
		monster_id: monsterId,
		monster_image_id: monsterImageId,
		mimeType: imageResult.mimeType,
	});

	if (storageResult.outcome === "failed") {
		await callTransitionEndpoint(
			"/api/monsters/{monster_id}/generate-image/mark-failed/",
			{ monster_id: monsterId },
			jobId,
			accessToken,
			{
				error_code: "storage_failed",
				error_message: storageResult.safeErrorMessage,
			},
		);
		Sentry.captureEvent({
			message: "generate_image.storage_failed",
			level: "error",
			tags: { generation_mode: generationMode, error_code: "storage_failed" },
		});
		return jsonError({
			status: 500,
			code: "storage_failed",
			message: "Failed to store the generated image. Please try again.",
		});
	}

	// ── Step 9: Mark job as SUCCEEDED (Django creates MonsterImage) ──────────
	//
	// Django atomically creates the MonsterImage, links it to the Monster,
	// and transitions the job to SUCCEEDED.
	await callTransitionEndpoint(
		"/api/monsters/{monster_id}/generate-image/mark-succeeded/",
		{ monster_id: monsterId },
		jobId,
		accessToken,
		{
			monster_image_id: monsterImageId,
			public_image_url: storageResult.public_image_url,
			image_storage_path: storageResult.image_storage_path,
			provider: generationMode === "real" ? "vercel-ai-gateway" : "fake",
			provider_model:
				generationMode === "real" ? env.vercelAIImageModel : "fake",
		},
	);

	// ── Return success ────────────────────────────────────────────────────────
	return NextResponse.json(
		{
			outcome: "succeeded" as const,
			public_image_url: storageResult.public_image_url,
			image_storage_path: storageResult.image_storage_path,
		},
		{ status: 200 },
	);
}
