// _______________
// Server-only moderation policy for Monster Masher image generation prompts.
//
// Defines:
//   - The strict union of OpenAI moderation category names (with a compile-time
//     parity check against the OpenAI SDK so drift is caught at build time).
//   - The app-level `MONSTER_PROMPT_MODERATION_POLICY` object that controls which
//     categories block generation and at what score thresholds.
//   - The `evaluateWithPolicy()` helper that applies the policy to a raw OpenAI
//     moderation result.
//
// Security rules:
//   - This module is server-only. Never import it from client components or
//     NEXT_PUBLIC_ code paths.
//   - The policy is controlled exclusively by this module. It must never be
//     read from request bodies, query params, headers, cookies, or localStorage.
// _______________

import "server-only";

import type { Moderation } from "openai/resources/moderations";

// ---------------------------------------------------------------------------
// Category union
// ---------------------------------------------------------------------------

/**
 * All OpenAI moderation category names returned by `omni-moderation-latest`.
 *
 * This is the single source of truth for category names across the app.
 * The compile-time assertion immediately below ensures this union stays in sync
 * with the OpenAI SDK's `Moderation.Categories` interface. Adding a string that
 * the SDK does not know, or omitting a string the SDK does know, is a TS error.
 */
export type OpenAIModerationCategory =
	| "harassment"
	| "harassment/threatening"
	| "hate"
	| "hate/threatening"
	| "illicit"
	| "illicit/violent"
	| "self-harm"
	| "self-harm/intent"
	| "self-harm/instructions"
	| "sexual"
	| "sexual/minors"
	| "violence"
	| "violence/graphic";

/**
 * Compile-time parity check between our union and the OpenAI SDK type.
 *
 * Both directions are checked:
 *   - Every category we declare must be a key the SDK knows (`extends` left-to-right).
 *   - Every key the SDK knows must be in our union (`extends` right-to-left).
 *
 * If either direction fails, the `never` branch makes this assignment a type error,
 * surfacing the drift immediately at build time rather than silently at runtime.
 */
type _AssertCategoriesMatchSDK = [OpenAIModerationCategory] extends [
	keyof Moderation["categories"],
]
	? [keyof Moderation["categories"]] extends [OpenAIModerationCategory]
		? true
		: never
	: never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertCategoriesMatchSDK: _AssertCategoriesMatchSDK = true;

// ---------------------------------------------------------------------------
// Policy types
// ---------------------------------------------------------------------------

type ModerationPolicy = {
	/**
	 * Categories that block generation when OpenAI's boolean flag is `true`.
	 * Uses `readonly OpenAIModerationCategory[]` — any string outside the union
	 * is a compile-time error.
	 */
	rejectFlaggedCategories: readonly OpenAIModerationCategory[];
	/**
	 * Categories that block generation when the OpenAI score meets or exceeds
	 * the threshold, even if the boolean flag is `false`.
	 *
	 * Keys are constrained to `OpenAIModerationCategory`, so unknown keys are
	 * compile-time errors.
	 *
	 * Thresholds are project policy — not OpenAI defaults. Recalibrate after
	 * model upgrades or after reviewing production moderation signals.
	 */
	scoreThresholds: Partial<Record<OpenAIModerationCategory, number>>;
	/**
	 * Categories that are intentionally allowed (log-only).
	 * These will NOT block generation even if OpenAI's boolean flag is `true`.
	 */
	allowFlaggedCategories: readonly OpenAIModerationCategory[];
};

// ---------------------------------------------------------------------------
// App policy
// ---------------------------------------------------------------------------

/**
 * Monster Masher moderation policy for image-generation prompts.
 *
 * Key decisions:
 *
 *   `violence` is in `allowFlaggedCategories` — monster prompts may naturally
 *   describe claws, fangs, combat, or scary traits. Treating every "violence"
 *   flag as a hard block would reject too many legitimate monster descriptions.
 *
 *   `violence/graphic` remains in `rejectFlaggedCategories` and is also covered
 *   by a score threshold. Allowing fantasy violence is not the same as allowing
 *   depictions of graphic injury, gore, or mutilation.
 *
 * This policy object is never exposed to the client. It must not be imported
 * from any `NEXT_PUBLIC_` module or included in any API response.
 */
export const MONSTER_PROMPT_MODERATION_POLICY = {
	rejectFlaggedCategories: [
		"sexual",
		"sexual/minors",
		"hate",
		"hate/threatening",
		"harassment/threatening",
		"illicit",
		"illicit/violent",
		"self-harm",
		"self-harm/intent",
		"self-harm/instructions",
		"violence/graphic",
	],
	scoreThresholds: {
		"sexual/minors": 0.01,
		"hate/threatening": 0.1,
		"self-harm/intent": 0.1,
		"self-harm/instructions": 0.1,
		"illicit/violent": 0.2,
		// violence/graphic threshold is intentionally lower than the boolean flag
		// threshold so that borderline graphic content is caught even when the
		// boolean is false.
		"violence/graphic": 0.5,
	},
	allowFlaggedCategories: ["violence"],
} as const satisfies ModerationPolicy;

// ---------------------------------------------------------------------------
// Policy evaluation
// ---------------------------------------------------------------------------

/**
 * The app-level decision produced by applying `ModerationPolicy` to OpenAI's
 * raw moderation result.
 *
 * This type is server-only and must never reach the client. Use `ModerationResult`
 * (from `moderation.ts`) for anything that may be returned in an API response.
 */
export type ModerationDecision =
	| {
			outcome: "allowed";
			triggeredCategories: OpenAIModerationCategory[];
			triggeredScoreThresholds: OpenAIModerationCategory[];
	  }
	| {
			outcome: "blocked";
			/** Safe user-facing reason string. Does not expose category names or scores. */
			safeReason: string;
			triggeredCategories: OpenAIModerationCategory[];
			triggeredScoreThresholds: OpenAIModerationCategory[];
	  };

/**
 * Applies `policy` to OpenAI's raw moderation result and returns an
 * app-level `ModerationDecision`.
 *
 * Rules (in priority order):
 *   1. A category in `rejectFlaggedCategories` blocks if its boolean flag is `true`,
 *      UNLESS it is also listed in `allowFlaggedCategories`.
 *   2. A category whose score meets or exceeds its `scoreThresholds` entry blocks,
 *      regardless of the boolean flag.
 *   3. A category in `allowFlaggedCategories` does NOT block via rule 1, but is still
 *      subject to rule 2 if it has a score threshold.
 *   4. If both blocking and allowed conditions are present, blocking always wins.
 *
 * `result.flagged` from OpenAI is intentionally not the sole block condition.
 * We use our own policy so that categories like `violence` can be allowed without
 * ever blindly trusting the top-level `flagged` boolean.
 *
 * @param categories   `response.results[0].categories` from the OpenAI SDK.
 * @param categoryScores `response.results[0].category_scores` from the OpenAI SDK.
 * @param policy       The app moderation policy to apply.
 */
export function evaluatePromptWithModerationPolicy(
	categories: Moderation.Categories,
	categoryScores: Moderation.CategoryScores,
	policy: ModerationPolicy,
): ModerationDecision {
	const triggeredCategories: OpenAIModerationCategory[] = [];
	const triggeredScoreThresholds: OpenAIModerationCategory[] = [];

	for (const category of policy.rejectFlaggedCategories) {
		const flag = categories[category];
		// `illicit` and `illicit/violent` are `boolean | null` in the SDK.
		// We treat `null` as non-flagged — only an explicit `true` blocks.
		if (flag === true) {
			triggeredCategories.push(category);
		}
	}

	for (const [rawCategory, threshold] of Object.entries(
		policy.scoreThresholds,
	) as [OpenAIModerationCategory, number][]) {
		// Score thresholds apply regardless of the boolean flag, and regardless
		// of whether the category is in allowFlaggedCategories.
		if (categoryScores[rawCategory] >= threshold) {
			triggeredScoreThresholds.push(rawCategory);
		}
	}

	const isBlocked =
		triggeredCategories.length > 0 || triggeredScoreThresholds.length > 0;

	if (isBlocked) {
		return {
			outcome: "blocked",
			// Generic reason — do not expose category names or scores to the client.
			safeReason: "Prompt was blocked by moderation.",
			triggeredCategories,
			triggeredScoreThresholds,
		};
	}

	return { outcome: "allowed", triggeredCategories, triggeredScoreThresholds };
}
