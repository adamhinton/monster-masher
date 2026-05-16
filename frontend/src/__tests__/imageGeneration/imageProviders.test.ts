import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FakeImageProvider } from "@/lib/monsterGeneration/imageGeneration/fakeProviderType";
import { OpenAIImageProvider } from "@/lib/monsterGeneration/imageGeneration/openAI_Provider";

// ---------------------------------------------------------------------------
// FakeImageProvider
// ---------------------------------------------------------------------------

describe("FakeImageProvider", () => {
	it("returns a success result with PNG image bytes by default", async () => {
		const provider = new FakeImageProvider();
		const result = await provider.generate("a cute fire salamander");

		expect(result.outcome).toBe("success");
		if (result.outcome !== "success") return; // narrow for TS

		expect(result.mimeType).toBe("image/png");
		// imageBytes should be a non-empty Buffer
		expect(Buffer.isBuffer(result.imageBytes)).toBe(true);
		expect(result.imageBytes.length).toBeGreaterThan(0);
	});

	it("ignores the prompt content — always succeeds by default", async () => {
		const provider = new FakeImageProvider();
		// Providers don't run moderation — that's the moderation abstraction's job
		const result = await provider.generate("anything at all");
		expect(result.outcome).toBe("success");
	});

	it("returns a failed result when shouldFail=true", async () => {
		const provider = new FakeImageProvider(true);
		const result = await provider.generate("a cute fire salamander");

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return; // narrow for TS
		expect(typeof result.safeErrorMessage).toBe("string");
		expect(result.safeErrorMessage.length).toBeGreaterThan(0);
	});

	it("never includes imageBytes in a failed result", async () => {
		const provider = new FakeImageProvider(true);
		const result = await provider.generate("a cute fire salamander");

		// The discriminated union guarantees this at the type level, but we also
		// want a runtime assertion to catch any accidental structural change.
		expect(result).not.toHaveProperty("imageBytes");
	});
});

// ---------------------------------------------------------------------------
// OpenAIImageProvider (shell — not yet implemented - TODO write more tests when relevant)
// ---------------------------------------------------------------------------

describe("OpenAIImageProvider", () => {
	it("returns a failed result because the real implementation is not yet wired in", async () => {
		// This test documents the intentional behaviour of the Phase 4 shell.
		// When Phase 4 Step 18 is complete, this test should be replaced by real
		// integration / mock tests for the OpenAI API call.
		const provider = new OpenAIImageProvider();
		const result = await provider.generate("a cute fire salamander");

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return;
		expect(typeof result.safeErrorMessage).toBe("string");
	});
});

// ---------------------------------------------------------------------------
// getImageProvider factory
// ---------------------------------------------------------------------------

describe("getImageProvider", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns FakeImageProvider when IMAGE_GENERATION_MODE=fake", async () => {
		process.env.IMAGE_GENERATION_MODE = "fake";
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers");
		const provider = getImageProvider();
		// The factory should hand back a FakeImageProvider whose generate() succeeds
		const result = await provider.generate("test prompt");
		expect(result.outcome).toBe("success");
	});

	it("returns OpenAIImageProvider when IMAGE_GENERATION_MODE=real", async () => {
		process.env.IMAGE_GENERATION_MODE = "real";
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers");
		const provider = getImageProvider();
		// Shell returns failed — confirms we got the OpenAI provider, not the fake
		const result = await provider.generate("test prompt");
		expect(result.outcome).toBe("failed");
	});

	it("throws when IMAGE_GENERATION_MODE is unrecognised", async () => {
		process.env.IMAGE_GENERATION_MODE = "banana";
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers");
		expect(() => getImageProvider()).toThrow();
	});

	it("throws when IMAGE_GENERATION_MODE is absent", async () => {
		delete process.env.IMAGE_GENERATION_MODE;
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers");
		expect(() => getImageProvider()).toThrow("Missing IMAGE_GENERATION_MODE");
	});
});
