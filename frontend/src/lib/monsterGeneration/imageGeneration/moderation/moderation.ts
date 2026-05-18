// _______________
// Helpers for sending user prompts to OpenAI's free moderation endpoint before calling the image generation provider.

// For more info on OpenAI moderation API, see: https://developers.openai.com/api/docs/guides/moderation?example=text&lang=node.js
// _______________

import "server-only";

import * as Sentry from "@sentry/nextjs";
import OpenAI from "openai";

import { env } from "@/lib/env/env";
import {
	evaluatePromptWithModerationPolicy,
	MONSTER_PROMPT_MODERATION_POLICY,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderationPolicy";
import { MonsterImageGenJob } from "@/lib/api/schemas/monster/Monster_Image_Gen_Job_Schema";
import { UserProfile } from "@/lib/api/schemas/UserProfileSchema";
import { ReduxAuthState } from "../../../../../store/authSlice";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Discriminated union representing all possible moderation outcomes.
 *
 * Three outcomes only — no others exist at this layer:
 *
 *   `allowed` — Prompt is clean. The route may proceed to call the image provider.
 *
 *   `blocked` — Prompt was rejected. `safeReason` is safe to surface in UI.
 *               The route MUST short-circuit here and MUST NOT call
 *               the image provider. The job should be marked "blocked" on the backend.
 *
 *   `failed`  — The moderation check itself errored (network down, API key invalid, etc.).
 *               `safeErrorMessage` is safe to surface in UI.
 *               The route should treat this identically to a provider failure — mark the
 *               job "failed" and return an error response, not a blocked response.
 */
export type ModerationResult =
	| { outcome: "allowed" }
	| { outcome: "blocked"; safeReason: string }
	| { outcome: "failed"; safeErrorMessage: string };

/**
 * Typed input passed to every `ModerationProvider.moderate()` call.
 *
 * Using a typed input object (rather than a bare string) lets providers attach
 * structured context to Sentry logs without callers having to add extra args later.
 *
 * `imageGenerationJobId` must always be created server-side. Never trust a
 * client-supplied job id as authoritative for moderation logging.
 */
export type ModerationInput = {
	/** The final sanitised prompt text to moderate. */
	promptText: string;
	/** Django job id, or a `crypto.randomUUID()` server-side request id. */
	imageGenerationJobId: MonsterImageGenJob["id"];
	userId?: UserProfile["id"];
	authState: ReduxAuthState["status"]; // should be authenticated
	generationMode: typeof env.imageGenerationMode; // real or fake
};

/**
 * Contract every moderation provider must satisfy.
 *
 * Route handlers depend ONLY on this interface, never on a concrete class.
 * Implementations:
 *   - `FakeModerationProvider`      → tests and IMAGE_GENERATION_MODE=fake
 *   - `OpenAIModerationProvider`    → production with IMAGE_GENERATION_MODE=real
 *
 * Always obtain instances via `getModerationProvider()` rather than importing
 * concrete classes directly in route handlers.
 */
export interface ModerationProvider {
	/**
	 * Check whether `input.text` is acceptable for image generation.
	 *
	 * Callers must strip any HTML from `input.text` before passing here.
	 */
	moderate(input: ModerationInput): Promise<ModerationResult>;
}

// ---------------------------------------------------------------------------
// Sentry logging helpers (private to this module)
// ---------------------------------------------------------------------------

/**
 * Returns a sanitized version of `text` safe for Sentry logs.
 * Strips HTML angle brackets and ASCII control characters to prevent log injection.
 * When `maxLength` is provided, truncates to that many characters.
 */
function sanitizeForLog(text: string, maxLength?: number): string {
	const sanitized = text
		.replace(/[<>]/g, "")

		.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
		.trim();
	return maxLength !== undefined ? sanitized.slice(0, maxLength) : sanitized;
}

/**
 * Computes a SHA-256 hex digest of `text` using the Web Crypto API.
 * Available in Node.js 18+ and Edge Runtime without extra imports.
 * Allows full prompts to be correlated in Sentry without logging raw user text.
 */
async function sha256hex(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const buffer = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// ---------------------------------------------------------------------------
// Local banned-term guard (B3c)
// ---------------------------------------------------------------------------

/**
 * Known-blocked terms, grouped by category.
 *
 * This list is intentionally narrow and obvious. It covers:
 *   - Trademarked franchise characters (IP infringement risk for generated images)
 *   - Explicit graphic-content keywords too clear to need an API call
 *
 * This is a FIRST pass; the OpenAI moderation provider is the SECOND pass.
 */
const BANNED_TERMS = [
	// Major franchise characters — trademark / IP risk in generated imagery
	"pikachu",
	"pokemon",
	"mario",
	"luigi",
	"zelda",
	"sonic the hedgehog",
	"mickey mouse",
	"minnie mouse",
	"goku",
	"naruto",
	"minecraft creeper",
	"fortnite",
	// Explicitly graphic content
	"gore",
	"graphic violence",
	"blood",
	"torture",
	"mutilation",
	"snuff",
];

/**
 * Synchronous, zero-cost check for obviously banned content.
 *
 * Run this BEFORE calling any moderation provider — it has no network cost and
 * catches the most obvious violations instantly, saving an API round-trip.
 *
 * Returns `true` if `text` contains any term from `BANNED_TERMS` (case-insensitive,
 * substring match).
 *
 * @param text The raw prompt text to check.
 */
export function containsBannedTerms(text: string): boolean {
	const lowerText = text.toLowerCase();
	return BANNED_TERMS.some((term) => lowerText.includes(term));
}

// ---------------------------------------------------------------------------
// FakeModerationProvider
// ---------------------------------------------------------------------------

/**
 * Fake moderation provider for IMAGE_GENERATION_MODE=fake and unit tests.
 *
 * Default behaviour: allows everything (`{ outcome: 'allowed' }`), so the fake
 * pipeline can complete successfully without any real moderation call.
 *
 * Use `shouldBlock: true` to force a blocked result in tests that need to prove
 * the route short-circuits before calling the image provider.
 *
 * Constraints:
 *   - NEVER imports or references the real moderation SDK.
 *   - NEVER makes any network calls.
 */
export class FakeModerationProvider implements ModerationProvider {
	/**
	 * @param shouldBlock When `true`, every call returns `{ outcome: 'blocked' }`.
	 *   Use this in tests to prove blocked moderation never reaches the image provider.
	 */
	constructor(private readonly shouldBlock = false) {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async moderate(_input: ModerationInput): Promise<ModerationResult> {
		// Fake provider: never makes network calls.
		if (this.shouldBlock) {
			return {
				outcome: "blocked",
				safeReason: "Fake moderation provider: forced block for testing.",
			};
		}
		return { outcome: "allowed" };
	}
}

// ---------------------------------------------------------------------------
// OpenAIModerationProvider
// ---------------------------------------------------------------------------

/**
 * Production moderation provider that calls the OpenAI Moderation API
 * (`omni-moderation-latest`) and evaluates the result against the app's
 * server-only `MONSTER_PROMPT_MODERATION_POLICY`.
 *
 * Security constraints:
 *   - Server-only. Never import this class from a Client Component.
 *   - The OpenAI SDK reads `OPENAI_API_KEY` from the server env automatically.
 *     The key is validated separately in `env.ts`; do not expose it in logs.
 *   - Raw OpenAI responses (category names, scores, request ids) must never
 *     reach the client — only the safe `ModerationResult` shape is returned.
 *   - A moderation failure (network error, missing result, SDK error) always
 *     fails closed: generation is blocked, not silently allowed.
 */
export class OpenAIModerationProvider implements ModerationProvider {
	private readonly createClient: () => OpenAI;

	/**
	 * @param createClient Optional factory for the OpenAI client instance.
	 *   Defaults to `() => new OpenAI()` which reads `OPENAI_API_KEY` from the
	 *   server environment automatically.
	 *
	 *   Pass a custom factory in tests to inject a mock client without requiring
	 *   a real API key or network calls:
	 *   ```ts
	 *   new OpenAIModerationProvider(() => ({ moderations: { create: mockFn } } as OpenAI))
	 *   ```
	 */
	constructor(createClient?: () => OpenAI) {
		this.createClient = createClient ?? (() => new OpenAI());
	}

	async moderate(input: ModerationInput): Promise<ModerationResult> {
		// Compute prompt context before the try/catch so it is available for
		// Sentry logging in both the success and error paths.
		const promptLength = input.promptText.length;
		const promptPreview = sanitizeForLog(input.promptText, 200);
		const promptSha256 = await sha256hex(input.promptText);

		try {
			// `new OpenAI()` reads OPENAI_API_KEY from the server environment.
			// Instantiated here (not in the constructor) so the try/catch covers
			// a missing key in test environments and fails gracefully.
			const openai = this.createClient();

			const response = await openai.moderations.create({
				model: "omni-moderation-latest",
				input: input.promptText,
			});

			const result = response.results[0];
			if (!result) {
				// OpenAI returned an empty results array — treat as a provider failure.
				Sentry.withScope((scope) => {
					scope.setTags({
						feature: "image_generation",
						provider: "openai",
						moderation_model: response.model,
						moderation_outcome: "failed",
						generation_mode: input.generationMode,
						auth_state: input.authState,
					});
					scope.setContext("moderation", {
						imageGenerationJobId: input.imageGenerationJobId,
						openaiModerationId: response.id,
						reason: "empty_results_array",
						promptPreview,
						promptSha256,
						promptLength,
						...(env.sentryLogFullModerationPrompts
							? { promptFull: sanitizeForLog(input.promptText) }
							: {}),
					});
					Sentry.captureMessage("image_generation.moderation.failed", "error");
				});
				return {
					outcome: "failed",
					safeErrorMessage: "Moderation check failed.",
				};
			}

			// Apply the server-only app policy to the raw OpenAI result.
			// `result.flagged` is logged below but is NOT the sole block condition —
			// evaluatePromptWithModerationPolicy() applies the app policy instead.
			const decision = evaluatePromptWithModerationPolicy(
				result.categories,
				result.category_scores,
				MONSTER_PROMPT_MODERATION_POLICY,
			);

			// Log exactly one Sentry event per moderation evaluation.
			// Raw categories and scores stay in Sentry only — never returned to
			// the client. Use Sentry.withScope() to isolate tags/context from other
			// events on the same request.
			Sentry.withScope((scope) => {
				scope.setTags({
					feature: "image_generation",
					provider: "openai",
					moderation_model: response.model,
					moderation_outcome: decision.outcome,
					generation_mode: input.generationMode,
					auth_state: input.authState,
				});
				scope.setContext("moderation", {
					imageGenerationJobId: input.imageGenerationJobId,
					openaiModerationId: response.id,
					flagged: result.flagged,
					categories: result.categories,
					categoryScores: result.category_scores,
					triggeredCategories: decision.triggeredCategories,
					triggeredScoreThresholds: decision.triggeredScoreThresholds,
					promptPreview,
					promptSha256,
					promptLength,
					...(env.sentryLogFullModerationPrompts
						? { promptFull: sanitizeForLog(input.promptText) }
						: {}),
				});
				const eventName =
					decision.outcome === "allowed"
						? "image_generation.moderation.allowed"
						: "image_generation.moderation.blocked";
				const level = decision.outcome === "allowed" ? "info" : "warning";
				Sentry.captureMessage(eventName, level);
			});

			if (decision.outcome === "blocked") {
				// Return only the safe reason — never expose category names or scores.
				return {
					outcome: "blocked",
					safeReason: decision.safeReason,
				};
			}

			return { outcome: "allowed" };
		} catch {
			// Network errors, SDK errors, missing API key — all fail closed.
			// Raw error details must never reach the client.
			Sentry.withScope((scope) => {
				scope.setTags({
					feature: "image_generation",
					provider: "openai",
					moderation_outcome: "failed",
					generation_mode: input.generationMode,
					auth_state: input.authState,
				});
				scope.setContext("moderation", {
					imageGenerationJobId: input.imageGenerationJobId,
					promptPreview,
					promptSha256,
					promptLength,
				});
				Sentry.captureMessage("image_generation.moderation.failed", "error");
			});
			return {
				outcome: "failed",
				safeErrorMessage: "Moderation check failed.",
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Factory (analogous to getImageProvider in providers.ts)
// ---------------------------------------------------------------------------

/**
 * Returns the correct ModerationProvider for the current IMAGE_GENERATION_MODE.
 *
 *   IMAGE_GENERATION_MODE=fake → FakeModerationProvider (allows all by default, no API calls)
 *   IMAGE_GENERATION_MODE=real → OpenAIModerationProvider (live OpenAI call)
 *
 * Route handlers MUST call this factory rather than importing provider classes directly.
 *
 * IMPORTANT: After calling `moderate()`, if the result is `{ outcome: 'blocked' }`,
 * the route handler MUST return immediately and MUST NOT proceed to call the image provider.
 * That short-circuit logic lives in the route orchestration, not here.
 *
 * In tests, pass a FakeModerationProvider directly — do not call this factory.
 */
export function getModerationProvider(): ModerationProvider {
	if (env.imageGenerationMode === "fake") {
		return new FakeModerationProvider();
	}

	return new OpenAIModerationProvider();
}
