import "server-only";

import { env } from "@/lib/env/env";

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
 *               The route MUST short-circuit here (Step B3e) and MUST NOT call
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
 * Contract every moderation provider must satisfy.
 *
 * Route handlers depend ONLY on this interface, never on a concrete class.
 * Implementations:
 *   - `FakeModerationProvider`   → tests and IMAGE_GENERATION_MODE=fake
 *   - `OpenAIModerationProvider` → production with IMAGE_GENERATION_MODE=real (Phase 4 Step 19)
 *
 * Always obtain instances via `getModerationProvider()` rather than importing
 * concrete classes directly in route handlers.
 */
export interface ModerationProvider {
	/**
	 * Check whether `text` is acceptable for image generation.
	 *
	 * @param text Plain-text prompt. Callers must strip any HTML before passing here.
	 */
	moderate(text: string): Promise<ModerationResult>;
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
 * This is a FIRST pass, synchronous and free. The OpenAI Moderation API
 * (Phase 4 Step 19) handles the nuanced long tail — off-list terms, context-
 * dependent violations, subtle hate speech, etc.
 *
 * IMPORTANT: This constant is server-only. Do NOT re-export it or reference it
 * from any Client Component or `NEXT_PUBLIC_` code path.
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
// FakeModerationProvider (B3b)
// ---------------------------------------------------------------------------

/**
 * Fake moderation provider for IMAGE_GENERATION_MODE=fake and unit tests.
 *
 * Default behaviour: allows everything (`{ outcome: 'allowed' }`), so the fake
 * pipeline can complete successfully without any real moderation call.
 *
 * Use `shouldBlock: true` to force a blocked result in tests that need to prove
 * the route short-circuits before calling the image provider (Step B3e).
 *
 * Constraints:
 *   - NEVER imports or references the real moderation SDK.
 *   - NEVER makes any network calls.
 */
export class FakeModerationProvider implements ModerationProvider {
	/**
	 * @param shouldBlock When `true`, every call returns `{ outcome: 'blocked' }`.
	 *   Use this in Step B7 tests to prove blocked moderation never reaches the provider.
	 */
	constructor(private readonly shouldBlock = false) {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars --- will be fleshed out in future steps
	async moderate(_text: string): Promise<ModerationResult> {
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
// OpenAIModerationProvider shell (B3d)
// ---------------------------------------------------------------------------

/**
 * OpenAI Moderation API provider — shell for Phase 4 Step 19.
 *
 * Returns `{ outcome: 'failed' }` until the real implementation is wired in.
 * This is deliberate: if real mode is enabled before Phase 4 Step 19 is complete,
 * the pipeline fails explicitly rather than silently skipping moderation.
 *
 * TODO (Phase 4 Step 19): Fill in `moderate()`:
 *   1. Read OPENAI_API_KEY from the server env module.
 *   2. POST to the OpenAI Moderation API with `{ input: text }`.
 *   3. If `results[0].flagged`: return { outcome: 'blocked', safeReason: <category summary> }.
 *   4. Otherwise: return { outcome: 'allowed' }.
 *   5. Catch network/API errors: return { outcome: 'failed', safeErrorMessage }.
 *      Never let raw OpenAI error details reach the client.
 */
export class OpenAIModerationProvider implements ModerationProvider {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars --- will be fleshed out in future steps
	async moderate(_text: string): Promise<ModerationResult> {
		// Shell: real OpenAI moderation is wired in Phase 4 Step 19.
		return {
			outcome: "failed",
			safeErrorMessage:
				"Real OpenAI moderation provider is not yet implemented. Set IMAGE_GENERATION_MODE=fake.",
		};
	}
}

// ---------------------------------------------------------------------------
// Factory (analogous to getImageProvider in providers.ts)
// ---------------------------------------------------------------------------

/**
 * Returns the correct ModerationProvider for the current IMAGE_GENERATION_MODE.
 *
 *   IMAGE_GENERATION_MODE=fake → FakeModerationProvider (allows all by default, no API calls)
 *   IMAGE_GENERATION_MODE=real → OpenAIModerationProvider (live OpenAI call — Phase 4 Step 19)
 *
 * Route handlers MUST call this factory rather than importing provider classes directly.
 *
 * IMPORTANT (Step B3e): After calling `moderate()`, if the result is `{ outcome: 'blocked' }`,
 * the route handler MUST return immediately and MUST NOT proceed to call the image provider.
 * That short-circuit logic lives in the route orchestration (Step B5d), not here.
 *
 * In tests, pass a FakeModerationProvider directly — do not call this factory.
 */
export function getModerationProvider(): ModerationProvider {
	if (env.imageGenerationMode === "fake") {
		return new FakeModerationProvider();
	}

	return new OpenAIModerationProvider();
}
