// ──────────────────────────────────────────────────────────────────────────────
// Unit tests for evaluatePromptWithModerationPolicy().
//
// These tests exercise the pure policy-evaluation function in isolation — no
// network calls, no mocking required. The goal is to verify that the app-level
// Monster Masher policy correctly allows combat/monster content while still
// blocking genuinely harmful categories and score thresholds.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
	evaluatePromptWithModerationPolicy,
	MONSTER_PROMPT_MODERATION_POLICY,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderationPolicy";
import type { Moderation } from "openai/resources/moderations";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * All boolean flags false (or null for nullable categories).
 * Used as the baseline for clean-prompt tests.
 */
function makeCategories(
	overrides: Partial<Record<string, boolean | null>> = {},
): Moderation.Categories {
	return {
		harassment: false,
		"harassment/threatening": false,
		hate: false,
		"hate/threatening": false,
		illicit: null,
		"illicit/violent": null,
		"self-harm": false,
		"self-harm/intent": false,
		"self-harm/instructions": false,
		sexual: false,
		"sexual/minors": false,
		violence: false,
		"violence/graphic": false,
		...overrides,
	} as unknown as Moderation.Categories;
}

/**
 * All scores well below every threshold.
 * `sexual/minors` threshold is 0.01 — default here is 0.000001.
 * `violence/graphic` threshold is 0.5 — default here is 0.001.
 */
function makeScores(
	overrides: Partial<Record<string, number>> = {},
): Moderation.CategoryScores {
	return {
		harassment: 0.001,
		"harassment/threatening": 0.001,
		hate: 0.001,
		"hate/threatening": 0.001,
		illicit: 0.001,
		"illicit/violent": 0.001,
		"self-harm": 0.001,
		"self-harm/intent": 0.001,
		"self-harm/instructions": 0.001,
		sexual: 0.001,
		"sexual/minors": 0.000001,
		violence: 0.001,
		"violence/graphic": 0.001,
		...overrides,
	} as unknown as Moderation.CategoryScores;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("evaluatePromptWithModerationPolicy", () => {
	// ── Clean prompt ──────────────────────────────────────────────────────────

	describe("clean prompt — no flags, all scores below threshold", () => {
		it("returns allowed", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("allowed");
		});

		it("has empty triggeredCategories", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.triggeredCategories).toEqual([]);
		});

		it("has empty triggeredScoreThresholds", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.triggeredScoreThresholds).toEqual([]);
		});
	});

	// ── violence: true — allowed by Monster Masher policy ────────────────────

	describe("violence: true (in allowFlaggedCategories)", () => {
		it("returns allowed — violence is permitted for monster prompts", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ violence: true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("allowed");
		});

		it("does NOT add violence to triggeredCategories", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ violence: true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.triggeredCategories).not.toContain("violence");
		});

		it("does NOT add violence to triggeredScoreThresholds", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ violence: true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.triggeredScoreThresholds).not.toContain("violence");
		});
	});

	// ── violence/graphic: true — blocked ─────────────────────────────────────

	describe("violence/graphic: true", () => {
		it("returns blocked", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "violence/graphic": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});

		it("adds violence/graphic to triggeredCategories", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "violence/graphic": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(result.triggeredCategories).toContain("violence/graphic");
		});

		it("safeReason is a non-empty string", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "violence/graphic": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(typeof result.safeReason).toBe("string");
			expect(result.safeReason.length).toBeGreaterThan(0);
		});

		it("safeReason does NOT expose the category name", () => {
			// The client must not learn which category triggered the block.
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "violence/graphic": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(result.safeReason).not.toContain("violence/graphic");
			// Note: "violence" alone appears in the reason text check is intentionally
			// not tested here — the important thing is the specific category is not named.
		});

		it("safeReason does NOT contain numeric scores", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "violence/graphic": true }),
				makeScores({ "violence/graphic": 0.99 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(result.safeReason).not.toMatch(/0\.\d+/);
		});
	});

	// ── Other flagged-category blocks ─────────────────────────────────────────

	describe("harassment/threatening: true", () => {
		it("returns blocked", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "harassment/threatening": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});
	});

	describe("sexual: true", () => {
		it("returns blocked", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ sexual: true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});
	});

	describe("illicit: true", () => {
		it("returns blocked when illicit is explicitly true", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ illicit: true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});

		it("returns allowed when illicit is null (not explicit true)", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ illicit: null }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("allowed");
		});
	});

	// ── Score thresholds override boolean flag ────────────────────────────────

	describe("score threshold exceeded — blocks even when boolean flag is false", () => {
		it("blocks when violence/graphic score >= 0.5 and boolean is false", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "violence/graphic": false }),
				makeScores({ "violence/graphic": 0.5 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
			if (result.outcome !== "blocked") return;
			expect(result.triggeredScoreThresholds).toContain("violence/graphic");
			// Boolean was false, so it should NOT also be in triggeredCategories
			expect(result.triggeredCategories).not.toContain("violence/graphic");
		});

		it("blocks when sexual/minors score >= 0.01 and boolean is false", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "sexual/minors": false }),
				makeScores({ "sexual/minors": 0.01 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
			if (result.outcome !== "blocked") return;
			expect(result.triggeredScoreThresholds).toContain("sexual/minors");
		});

		it("blocks when hate/threatening score >= 0.1 and boolean is false", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "hate/threatening": false }),
				makeScores({ "hate/threatening": 0.1 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});

		it("blocks when self-harm/intent score >= 0.1 and boolean is false", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ "self-harm/intent": false }),
				makeScores({ "self-harm/intent": 0.1 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});

		it("does NOT block when violence/graphic score is just below threshold (0.499)", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores({ "violence/graphic": 0.499 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("allowed");
		});

		it("does NOT block when sexual/minors score is just below threshold (0.0099)", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores({ "sexual/minors": 0.0099 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("allowed");
		});

		it("blocks at exactly the threshold (>= is inclusive)", () => {
			// 0.5 is exactly the violence/graphic threshold
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores({ "violence/graphic": 0.5 }),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});
	});

	// ── Multiple exceeded thresholds ──────────────────────────────────────────

	describe("multiple score thresholds exceeded simultaneously", () => {
		it("all exceeded categories appear in triggeredScoreThresholds", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories(),
				makeScores({
					"violence/graphic": 0.5,
					"sexual/minors": 0.01,
					"self-harm/intent": 0.1,
				}),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(result.triggeredScoreThresholds).toContain("violence/graphic");
			expect(result.triggeredScoreThresholds).toContain("sexual/minors");
			expect(result.triggeredScoreThresholds).toContain("self-harm/intent");
		});
	});

	// ── blocked categories win over allowed categories ────────────────────────

	describe("blocked categories win over allowed categories", () => {
		it("returns blocked when violence: true AND harassment/threatening: true", () => {
			// violence is allowed, but harassment/threatening is blocked — blocked wins
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ violence: true, "harassment/threatening": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			expect(result.outcome).toBe("blocked");
		});

		it("includes harassment/threatening in triggeredCategories but NOT violence", () => {
			const result = evaluatePromptWithModerationPolicy(
				makeCategories({ violence: true, "harassment/threatening": true }),
				makeScores(),
				MONSTER_PROMPT_MODERATION_POLICY,
			);
			if (result.outcome !== "blocked") throw new Error("expected blocked");
			expect(result.triggeredCategories).toContain("harassment/threatening");
			expect(result.triggeredCategories).not.toContain("violence");
		});
	});
});
