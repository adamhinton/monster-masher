// _______________
// Helper for sending image-generation-done notification emails.
//
// Call this from generate-image/route.ts after the pipeline reaches a terminal
// state. It is intentionally fire-and-forget — callers use `void` so the main
// generation response is not delayed by email delivery.
//
// Flow:
//   1. Caller (generate-image/route.ts) invokes notifyImageGenerationDone().
//   2. This helper makes a server-to-server POST to /api/email/image-generation-done,
//      forwarding the Supabase access token so the route can verify the sender.
//   3. The route verifies the JWT, checks the email matches the user, and sends
//      via Resend. Failures are captured as Sentry alerts in the route handler.
// _______________

import "server-only";

import type {
	ImageGenerationDoneScenario,
	SendEmailResponse,
} from "@/lib/api/email/imageGenerationDoneTypes";
import { Monster } from "../schemas/monster/MonsterSchema";
import { UserProfile } from "../schemas/UserProfileSchema";
import { env } from "@/lib/env/env";

// ─── Helper ───────────────────────────────────────────────────────────────────

export interface NotifyImageGenerationDoneParams {
	/** Base URL of this Next.js app (e.g. request.nextUrl.origin). */
	/** Recipient email. Must match the authenticated Supabase user's email. */
	email: UserProfile["email"];
	/** Outcome that triggered this notification. */
	scenario: ImageGenerationDoneScenario;
	/**
	 * Supabase access token for the authenticated user.
	 * Forwarded as a Bearer token so the email route can verify the caller.
	 */
	accessToken: string;
	/** Optional monster display name included in the email body. */
	monsterName?: Monster["display_name"];
}

/**
 * Sends an image-generation-done notification email by calling the internal
 * POST /api/email/image-generation-done route.
 *
 * Returns a {@link SendEmailResponse} discriminated union — check `ok` to
 * determine whether delivery succeeded. Failures are already alerted to Sentry
 * by the route handler; callers do not need to re-report them.
 *
 * This function never throws. Network-level errors are caught and returned as
 * `{ ok: false, code: "resend_error", ... }`.
 *
 * @example
 * // Fire-and-forget after a successful generation — does not delay the response
 * void notifyImageGenerationDone({
 *   appBaseUrl: request.nextUrl.origin,
 *   email: userEmail,
 *   scenario: "succeeded",
 *   accessToken,
 *   monsterName: formValues.display_name,
 * });
 */
export async function notifyImageGenerationDone({
	email,
	scenario,
	accessToken,
	monsterName,
}: NotifyImageGenerationDoneParams): Promise<SendEmailResponse> {
	try {
		console.log("notifyImageGenerationDone called with:", {
			email,
			scenario,
			monsterName,
		});
		const url = `${env.appUrl}/api/email/image-generation-done`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				email,
				scenario,
				...(monsterName !== undefined ? { monsterName } : {}),
			}),
		});
		console.log(
			"response inside imageGenerationDoneEmail.ts from POST /api/email/image-generation/done:",
			response,
		);

		const responseBody: unknown = await response.json();

		// The route always returns a body matching SendEmailResponse or NextApiError.
		// On non-ok HTTP status, map to a typed error response so callers stay in
		// the discriminated-union world and never have to inspect raw status codes.
		if (!response.ok) {
			return {
				ok: false,
				code: "resend_error",
				message: `Email endpoint responded with HTTP ${response.status}.`,
			};
		}

		// TODO validate this
		return responseBody as unknown as SendEmailResponse;
	} catch {
		// Network-level error (fetch threw). The Sentry alert in the route may not
		// have fired if the request never reached the route, so we return a typed
		// error so the caller can decide whether to log it.
		return {
			ok: false,
			code: "resend_error",
			message: "Failed to reach the email endpoint.",
		};
	}
}
