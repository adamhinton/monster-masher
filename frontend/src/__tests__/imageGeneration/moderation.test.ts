import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	containsBannedTerms,
	FakeModerationProvider,
	OpenAIModerationProvider,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderation";

// ---------------------------------------------------------------------------
// containsBannedTerms — synchronous local guard
// ---------------------------------------------------------------------------

describe("containsBannedTerms", () => {
	it("returns false for a clean monster prompt", () => {
		expect(containsBannedTerms("a mossy bog creature with ember eyes")).toBe(
			false,
		);
	});

	it("returns true for a franchise character name (pikachu)", () => {
		expect(containsBannedTerms("a cute pikachu")).toBe(true);
	});

	it("returns true for a franchise character name (mario)", () => {
		expect(containsBannedTerms("a mushroom monster like mario")).toBe(true);
	});

	it("is case-insensitive", () => {
		expect(containsBannedTerms("A Scary GORE monster")).toBe(true);
		expect(containsBannedTerms("PIKACHU the electric type")).toBe(true);
	});

	it("returns true for explicit graphic keywords", () => {
		expect(containsBannedTerms("creature made of blood")).toBe(true);
		expect(containsBannedTerms("torture chamber beast")).toBe(true);
	});

	it("returns false for text that merely sounds similar but is clean", () => {
		// 'gore' inside a longer word should still match (substring), but
		// clearly clean prompts with no banned terms should not match at all
		expect(containsBannedTerms("a crystalline forest spirit")).toBe(false);
		expect(containsBannedTerms("dragon with orange scales")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// FakeModerationProvider
// ---------------------------------------------------------------------------

describe("FakeModerationProvider", () => {
	it("allows all prompts by default", async () => {
		const provider = new FakeModerationProvider();
		const result = await provider.moderate("a mossy bog creature");

		expect(result.outcome).toBe("allowed");
	});

	it("allows regardless of prompt content when shouldBlock=false", async () => {
		// Moderation providers don't run banned-term guards — that's the caller's job.
		// The fake provider's only job is to return allowed/blocked based on shouldBlock.
		const provider = new FakeModerationProvider(false);
		const result = await provider.moderate("pikachu with gore");
		expect(result.outcome).toBe("allowed");
	});

	it("returns blocked when shouldBlock=true", async () => {
		const provider = new FakeModerationProvider(true);
		const result = await provider.moderate("a mossy bog creature");

		expect(result.outcome).toBe("blocked");
		if (result.outcome !== "blocked") return; // narrow for TS
		expect(typeof result.safeReason).toBe("string");
		expect(result.safeReason.length).toBeGreaterThan(0);
	});

	it("never includes fields from other outcome variants when blocked", async () => {
		const provider = new FakeModerationProvider(true);
		const result = await provider.moderate("a mossy bog creature");

		expect(result).not.toHaveProperty("safeErrorMessage");
	});

	it("never includes fields from other outcome variants when allowed", async () => {
		const provider = new FakeModerationProvider();
		const result = await provider.moderate("a mossy bog creature");

		expect(result).not.toHaveProperty("safeReason");
		expect(result).not.toHaveProperty("safeErrorMessage");
	});
});

// ---------------------------------------------------------------------------
// OpenAIModerationProvider (shell — not yet implemented)
// ---------------------------------------------------------------------------

describe("OpenAIModerationProvider", () => {
	it("returns failed because the real implementation is not yet wired in", async () => {
		// Documents the intentional shell behaviour.
		// Replace this test in Phase 4 Step 19 with proper mock-based API tests.
		const provider = new OpenAIModerationProvider();
		const result = await provider.moderate("a mossy bog creature");

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return;
		expect(typeof result.safeErrorMessage).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// getModerationProvider factory
// ---------------------------------------------------------------------------

describe("getModerationProvider", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns FakeModerationProvider when IMAGE_GENERATION_MODE=fake", async () => {
		process.env.IMAGE_GENERATION_MODE = "fake";
		const { getModerationProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/moderation/moderation");
		const provider = getModerationProvider();
		const result = await provider.moderate("a bog creature");
		expect(result.outcome).toBe("allowed");
	});

	it("returns OpenAIModerationProvider when IMAGE_GENERATION_MODE=real", async () => {
		process.env.IMAGE_GENERATION_MODE = "real";
		const { getModerationProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/moderation/moderation");
		const provider = getModerationProvider();
		// Shell returns failed — confirms we got the OpenAI provider
		const result = await provider.moderate("a bog creature");
		expect(result.outcome).toBe("failed");
	});

	it("throws when IMAGE_GENERATION_MODE is absent", async () => {
		delete process.env.IMAGE_GENERATION_MODE;
		const { getModerationProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/moderation/moderation");
		expect(() => getModerationProvider()).toThrow(
			"Missing IMAGE_GENERATION_MODE",
		);
	});
});
