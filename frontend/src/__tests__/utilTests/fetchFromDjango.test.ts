// ________
// Tests for src/lib/django/fetchFromDjango.ts
// ________
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// vi.mock calls are hoisted before imports, so the alias + these mocks are in place
// before fetchFromDjango is imported.
vi.mock("@/lib/env/env", () => ({
	env: { djangoApiBaseUrl: "https://api.test.com" },
}));

import { fetchLoggedInDjangoUserProfile } from "@/lib/django/fetchFromDjango";
import { validUserProfile } from "../__testUtils__/fixtures";

function makeJsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("fetchLoggedInDjangoUserProfile", () => {
	const mockFetch = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		mockFetch.mockReset();
	});

	it("calls POST to the correct bootstrap URL", async () => {
		mockFetch.mockResolvedValueOnce(makeJsonResponse(validUserProfile));
		await fetchLoggedInDjangoUserProfile("my-token");
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.test.com/api/me/bootstrap/",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("sends the Authorization Bearer header", async () => {
		mockFetch.mockResolvedValueOnce(makeJsonResponse(validUserProfile));
		await fetchLoggedInDjangoUserProfile("my-token");
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer my-token",
				}),
			}),
		);
	});

	it("returns the parsed UserProfile on success", async () => {
		mockFetch.mockResolvedValueOnce(makeJsonResponse(validUserProfile));
		const result = await fetchLoggedInDjangoUserProfile("my-token");
		expect(result.email).toBe("test@example.com");
		expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
	});

	it("throws when the response is not ok (e.g. 401)", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response("Unauthorized", { status: 401 }),
		);
		await expect(fetchLoggedInDjangoUserProfile("bad-token")).rejects.toThrow();
	});

	it("throws when response body is not valid JSON", async () => {
		mockFetch.mockResolvedValueOnce(new Response("not json", { status: 200 }));
		await expect(fetchLoggedInDjangoUserProfile("my-token")).rejects.toThrow();
	});

	it("throws when response body fails schema validation", async () => {
		mockFetch.mockResolvedValueOnce(
			makeJsonResponse({ id: "not-a-uuid", email: "bad" }),
		);
		await expect(fetchLoggedInDjangoUserProfile("my-token")).rejects.toThrow();
	});

	it("throws on network failure (fetch rejects)", async () => {
		mockFetch.mockRejectedValueOnce(new TypeError("Network error"));
		await expect(fetchLoggedInDjangoUserProfile("my-token")).rejects.toThrow();
	});
});
