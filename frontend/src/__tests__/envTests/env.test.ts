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
		const { env } = await import("@/lib/env");
		// Trailing slash should be stripped
		expect(env.djangoApiBaseUrl).toBe("https://api.example.com");
	});

	it("throws when NEXT_PUBLIC_DJANGO_API_BASE_URL is missing", async () => {
		delete process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL;
		await expect(import("@/lib/env")).rejects.toThrow(
			"Missing NEXT_PUBLIC_DJANGO_API_BASE_URL",
		);
	});
});
