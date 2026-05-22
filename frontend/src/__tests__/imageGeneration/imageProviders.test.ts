import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { GenerateImageResult, GeneratedFile } from "ai";
import { FakeImageProvider } from "@/lib/monsterGeneration/imageGeneration/providers/fakeProviderType";
import { VercelAIGatewayImageProvider } from "@/lib/monsterGeneration/imageGeneration/providers/vercelAIGatewayImageProvider";

// ---------------------------------------------------------------------------
// Mock the Vercel AI SDK to prevent real API calls in all tests
// ---------------------------------------------------------------------------

vi.mock("ai", () => ({
	createGateway: vi.fn(),
	generateImage: vi.fn(),
}));

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
// VercelAIGatewayImageProvider
// ---------------------------------------------------------------------------

describe("VercelAIGatewayImageProvider", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			AI_GATEWAY_API_KEY: "vercel-test-key",
			AI_IMAGE_MODEL: "openai/gpt-image-2",
		};
		vi.resetAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns success with image bytes and mime type on successful generation", async () => {
		const { createGateway, generateImage } = await import("ai");
		const fakeUint8Array = new Uint8Array([1, 2, 3]);
		const fakeImageFile = {
			uint8Array: fakeUint8Array,
			mediaType: "image/png",
			base64: "AQID",
		} satisfies Partial<GeneratedFile> as unknown as GeneratedFile;

		vi.mocked(createGateway).mockReturnValue({
			image: vi.fn().mockReturnValue("mock-image-model"),
		} as unknown as ReturnType<typeof createGateway>);

		vi.mocked(generateImage).mockResolvedValue({
			image: fakeImageFile,
			images: [fakeImageFile],
		} as unknown as GenerateImageResult);

		const provider = new VercelAIGatewayImageProvider();
		const result = await provider.generate("a cute fire salamander");

		expect(result.outcome).toBe("success");
		if (result.outcome !== "success") return;
		expect(Buffer.isBuffer(result.imageBytes)).toBe(true);
		expect(result.imageBytes).toEqual(Buffer.from(fakeUint8Array));
		expect(result.mimeType).toBe("image/png");
		expect(generateImage).toHaveBeenCalledWith(
			expect.objectContaining({ size: "1024x1024" }),
		);
	});

	it("returns failed when the API call throws an error", async () => {
		const { createGateway, generateImage } = await import("ai");

		vi.mocked(createGateway).mockReturnValue({
			image: vi.fn().mockReturnValue("mock-image-model"),
		} as unknown as ReturnType<typeof createGateway>);

		vi.mocked(generateImage).mockRejectedValue(
			new Error("API error: rate limited"),
		);

		const provider = new VercelAIGatewayImageProvider();
		const result = await provider.generate("a cute fire salamander");

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return;
		expect(typeof result.safeErrorMessage).toBe("string");
		// Must not expose the raw API error message to the client
		expect(result.safeErrorMessage).not.toContain("rate limited");
	});

	it("returns failed with timeout message when generation times out", async () => {
		const { createGateway, generateImage } = await import("ai");

		vi.mocked(createGateway).mockReturnValue({
			image: vi.fn().mockReturnValue("mock-image-model"),
		} as unknown as ReturnType<typeof createGateway>);

		vi.mocked(generateImage).mockImplementation(
			({ abortSignal }: { abortSignal?: AbortSignal }) =>
				new Promise<GenerateImageResult>((_resolve, reject) => {
					abortSignal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		);

		vi.useFakeTimers();
		const provider = new VercelAIGatewayImageProvider();
		const generatePromise = provider.generate("a cute fire salamander");
		// Advance past the 90s timeout
		await vi.advanceTimersByTimeAsync(91_000);
		const result = await generatePromise;
		vi.useRealTimers();

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return;
		expect(result.safeErrorMessage).toContain("timed out");
	});

	it("returns failed when AI_GATEWAY_API_KEY is missing", async () => {
		delete process.env.AI_GATEWAY_API_KEY;
		const provider = new VercelAIGatewayImageProvider();
		const result = await provider.generate("a cute fire salamander");

		expect(result.outcome).toBe("failed");
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
			await import("@/lib/monsterGeneration/imageGeneration/providers/providers");
		const provider = getImageProvider();
		// The factory should hand back a FakeImageProvider whose generate() succeeds
		const result = await provider.generate("test prompt");
		expect(result.outcome).toBe("success");
	});

	it("returns VercelAIGatewayImageProvider when IMAGE_GENERATION_MODE=real", async () => {
		process.env.IMAGE_GENERATION_MODE = "real";
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers/providers");
		const provider = getImageProvider();
		// Without AI_GATEWAY_API_KEY set, the real provider returns failed —
		// confirms we got VercelAIGatewayImageProvider, not the FakeImageProvider
		// (which would return success).
		const result = await provider.generate("test prompt");
		expect(result.outcome).toBe("failed");
	});

	it("throws when IMAGE_GENERATION_MODE is unrecognised", async () => {
		process.env.IMAGE_GENERATION_MODE = "banana";
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers/providers");
		expect(() => getImageProvider()).toThrow();
	});

	it("throws when IMAGE_GENERATION_MODE is absent", async () => {
		delete process.env.IMAGE_GENERATION_MODE;
		const { getImageProvider } =
			await import("@/lib/monsterGeneration/imageGeneration/providers/providers");
		expect(() => getImageProvider()).toThrow("Missing IMAGE_GENERATION_MODE");
	});
});
