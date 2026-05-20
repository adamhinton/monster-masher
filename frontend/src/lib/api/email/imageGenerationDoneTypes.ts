// _______________
// Shared types for the image-generation-done email flow.
//
// This is the single source of truth for all types used across:
//   - POST /api/email/image-generation-done (route handler)
//   - imageGenerationDoneEmail.ts (server helper)
//   - ImageGenerationSuccess.tsx (email template components)
// _______________

import { z } from "zod";

// ─── Scenario union ──────────────────────────────────────────────────────────

/**
 * Zod schema for a valid image-generation-done email scenario.
 * This is the single source of truth — the TypeScript type is derived below.
 */
export const imageGenerationDoneScenarioSchema = z.union([
	z.literal("succeeded"),
	/** Prompt was blocked by the content moderation policy. */
	z.literal("failed/moderation"),
	/** A provider or storage network call failed during generation. */
	z.literal("failed/network-error"),
	/** Generation failed for an unclassified internal reason. */
	z.literal("failed/unspecified"),
]);

/**
 * Discriminated string union for every scenario in which a
 * image-generation-done notification email can be sent.
 *
 * Add new scenarios by extending `imageGenerationDoneScenarioSchema` above —
 * all consumers that use this type will update automatically via the union.
 */
export type ImageGenerationDoneScenario = z.infer<
	typeof imageGenerationDoneScenarioSchema
>;

/**
 * Runtime array of every valid scenario value.
 * Useful for test loops, exhaustiveness checks, or UI dropdowns.
 * `satisfies` guarantees it stays in sync with `ImageGenerationDoneScenario`.
 */
export const IMAGE_GENERATION_DONE_SCENARIOS: ImageGenerationDoneScenario[] = [
	"succeeded",
	"failed/moderation",
	"failed/network-error",
	"failed/unspecified",
];

// ─── Request schema ──────────────────────────────────────────────────────────

/**
 * Zod schema for the POST body accepted by
 * POST /api/email/image-generation-done.
 *
 * The email address is normalised (trimmed + lower-cased) before being
 * checked against the authenticated user's email.
 */
export const imageGenerationDoneRequestSchema = z.object({
	/** Recipient address. Must match the authenticated Supabase user's email. */
	email: z.email().trim().toLowerCase(),
	/** Which outcome triggered this notification. */
	scenario: imageGenerationDoneScenarioSchema,
	/**
	 * Optional display name of the monster.
	 * When provided it is included in the email body so the user knows
	 * which monster this notification is about.
	 */
	monsterName: z.string().max(80).trim().optional(),
});

export type ImageGenerationDoneRequest = z.infer<
	typeof imageGenerationDoneRequestSchema
>;

// ─── Response types ──────────────────────────────────────────────────────────

/** Returned by POST /api/email/image-generation-done when the email is sent. */
export type SendEmailSuccessResponse = {
	ok: true;
	/** Resend message ID — useful for correlating Sentry events with delivery logs. */
	messageId: string;
};

/**
 * Returned by POST /api/email/image-generation-done when something goes wrong.
 * The `code` field identifies the failure category for the caller.
 */
export type SendEmailErrorResponse = {
	ok: false;
	code:
		| "not_authenticated"
		| "email_mismatch"
		| "resend_error"
		| "invalid_request"
		| "invalid_json";
	message: string;
};

/**
 * Full discriminated union returned by POST /api/email/image-generation-done.
 * Callers should narrow on `ok` before accessing other fields.
 */
export type SendEmailResponse =
	| SendEmailSuccessResponse
	| SendEmailErrorResponse;
