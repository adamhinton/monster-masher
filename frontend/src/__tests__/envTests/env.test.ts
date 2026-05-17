import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("env.ts", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Isolate env mutations between tests
		process.env = { ...originalEnv };
		// Purge module cache so re-import re-evaluates the module
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("exports djangoApiBaseUrl when env var is present", async () => {
		process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL = "https://api.example.com/";
		const { env } = await import("@/lib/env/env");
		// Trailing slash should be stripped
		expect(env.djangoApiBaseUrl).toBe("https://api.example.com");
	});

	it("throws when NEXT_PUBLIC_DJANGO_API_BASE_URL is missing", async () => {
		delete process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL;
		const { env } = await import("@/lib/env/env");
		expect(() => env.djangoApiBaseUrl).toThrow(
			"Missing NEXT_PUBLIC_DJANGO_API_BASE_URL",
		);
	});

	// B7d: real mode provider key validation
	it("throws when OPENAI_API_KEY is absent", async () => {
		delete process.env.OPENAI_API_KEY;
		const { env } = await import("@/lib/env/env");
		expect(() => env.openAIApiKey).toThrow("Missing OPENAI_API_KEY");
	});

	it("returns OPENAI_API_KEY when it is present", async () => {
		process.env.OPENAI_API_KEY = "sk-test-key";
		const { env } = await import("@/lib/env/env");
		expect(env.openAIApiKey).toBe("sk-test-key");
	});
});
