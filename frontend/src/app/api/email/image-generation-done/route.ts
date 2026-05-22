// _______________
// POST /api/email/image-generation-done
//
// Sends a transactional notification email to the authenticated user when their
// monster image generation has completed (succeeded or failed).
//
// Security model:
//   - Requires a valid Supabase JWT in the Authorization header.
//   - The passed-in email address is validated against the JWT owner's email —
//     it is impossible to send a notification to a different user's address.
//   - user_profile_id always comes from the verified JWT; never from the body.
//
// Failure handling:
//   - Resend delivery failures are captured as Sentry alerts (not just logs)
//     with full context (scenario, job details, Resend error).
//   - Auth and validation failures return structured NextApiError responses.
//
// Caller: This endpoint is not called directly from client code. Use the
// notifyImageGenerationDone() helper in src/lib/api/email/imageGenerationDoneEmail.ts.
// _______________

import "server-only";

import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

import { env } from "@/lib/env/env";
import { createClientSSROnly } from "@/lib/supabase/server";
import { type NextApiError } from "@/lib/api/errors";
import {
	imageGenerationDoneRequestSchema,
	type SendEmailResponse,
} from "@/lib/api/email/imageGenerationDoneTypes";
import { ImageGenerationDoneEmail } from "@/components/emailTemplatesToUser/imageGenerationDone/ImageGenerationSuccess";
import { rejectCrossSiteMutatingRequest } from "@/lib/security/requestGuards";
import {
	checkRateLimit,
	rateLimitExceededResponse,
} from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * The "from" address for Monster Masher notification emails.
 * Update to a verified Resend domain address before going to production.
 * See: https://resend.com/domains
 */
const FROM_ADDRESS = "auth@auth.adam-hinton.com";

// ─── Subject lines per scenario ──────────────────────────────────────────────

/**Different subject lines for different monster generation outcomes */
const SUBJECT_BY_SCENARIO: Record<
	import("@/lib/api/email/imageGenerationDoneTypes").ImageGenerationDoneScenario,
	string
> = {
	succeeded: "Your monster is ready! 🐉",
	"failed/moderation": "Monster generation blocked",
	"failed/network-error": "Monster generation ran into a problem",
	"failed/unspecified": "Monster generation didn't complete",
};

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/email/image-generation-done
 *
 * Sends an image-generation-done notification to the authenticated user.
 *
 * Request headers:
 *   Authorization: Bearer <supabase_access_token>
 *
 * Request body: {@link ImageGenerationDoneRequest}
 *   - email     — recipient address; must match the JWT owner's email
 *   - scenario  — {@link ImageGenerationDoneScenario} describing the outcome
 *   - monsterName — optional display name included in the email body
 *
 * Responses:
 *   200 — email sent; body is {@link SendEmailSuccessResponse}
 *   400 — invalid JSON or request body
 *   401 — missing or invalid Supabase session
 *   403 — email does not match the authenticated user
 *   500 — Resend delivery failure (also triggers a Sentry alert)
 */
export async function POST(
	request: NextRequest,
): Promise<NextResponse<SendEmailResponse | NextApiError>> {
	const crossSiteResponse = rejectCrossSiteMutatingRequest(request);
	if (crossSiteResponse) return crossSiteResponse;

	console.log(
		"Received request to /api/email/image-generation-done",
		// accessToken,
	);

	// ── Step 1: Verify Supabase session via JWT in Authorization header ────────
	//
	// We extract the access token from the Authorization header so this route
	// works for internal server-to-server calls (e.g. from generate-image/route.ts)
	// where browser cookies are not forwarded.
	//
	// supabase.auth.getUser(jwt) sends the JWT to Supabase Auth for server-side
	// verification — it is NOT a local decode and cannot be spoofed.
	const authHeader = request.headers.get("Authorization");
	const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? null;

	if (!accessToken) {
		return NextResponse.json<NextApiError>(
			{
				error: {
					code: "not_authenticated",
					message: "Authorization header with Bearer token is required.",
				},
			},
			{ status: 401 },
		);
	}

	const supabase = await createClientSSROnly();
	const { data: userData, error: authError } =
		await supabase.auth.getUser(accessToken);

	// console.log("data in  api/email/image-generation-done/route.ts:", data);
	// console.log("data", data);
	console.log(
		"userData in api/email/image-generation-done/route.ts:",
		userData,
	);

	if (authError || !userData.user) {
		return NextResponse.json<NextApiError>(
			{
				error: {
					code: "not_authenticated",
					message: "Invalid or expired session.",
				},
			},
			{ status: 401 },
		);
	}

	// ── Step 2: Parse and validate request body ───────────────────────────────

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return NextResponse.json<NextApiError>(
			{
				error: {
					code: "invalid_json",
					message: "Request body must be valid JSON.",
				},
			},
			{ status: 400 },
		);
	}

	const parsed = imageGenerationDoneRequestSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json<NextApiError>(
			{
				error: {
					code: "invalid_request",
					message: "Invalid request body: " + parsed.error.message,
				},
			},
			{ status: 400 },
		);
	}

	const { email, scenario, monsterName, monsterId } = parsed.data;

	// ── Step 3: Verify email belongs to the authenticated user ────────────────
	//
	// The normalised (trimmed + lower-cased) body email is compared against the
	// email stored on the Supabase user record. This prevents one authenticated
	// user from sending notification emails to a different address.
	const authenticatedEmail = userData.user.email?.trim().toLowerCase();

	if (!authenticatedEmail || authenticatedEmail !== email) {
		return NextResponse.json<NextApiError>(
			{
				error: {
					code: "email_mismatch",
					message: "Email address does not match the authenticated user.",
				},
			},
			{ status: 403 },
		);
	}

	const rateLimit = checkRateLimit({
		scope: "email-image-generation-done",
		identifier: authenticatedEmail,
		limit: 20,
		windowMs: 60 * 60 * 1000,
	});
	if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

	// ── Step 4: Send email via Resend ─────────────────────────────────────────

	const resend = new Resend(env.resendApiKey);

	const { data: resendData, error: resendError } = await resend.emails.send({
		from: FROM_ADDRESS,
		to: [email],
		subject: SUBJECT_BY_SCENARIO[scenario],
		react: ImageGenerationDoneEmail({
			scenario,
			monsterName,
			monsterId,
			appUrl: env.appUrl,
		}),
	});

	if (resendError || !resendData) {
		// Alert — not just a log — because a failed notification is a product-level
		// failure. Include the scenario and Resend error so on-call can diagnose.
		Sentry.captureEvent({
			message: "image_generation_done_email.send_failed",
			level: "error",
			tags: {
				email_scenario: scenario,
				error_code: "resend_delivery_failure",
			},
			extra: {
				scenario,
				monsterName: monsterName ?? null,
				resendError,
				recipientEmailHash: Buffer.from(email).toString("base64"),
			},
		});

		return NextResponse.json<SendEmailResponse>(
			{
				ok: false,
				code: "resend_error",
				message: "Failed to deliver the notification email.",
			},
			{ status: 500 },
		);
	}

	return NextResponse.json<SendEmailResponse>(
		{ ok: true, messageId: resendData.id },
		{ status: 200 },
	);
}
