// ________
// Tests for src/app/api/auth/callback/route.ts  (GET /api/auth/callback)
// ________
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createClientSSROnly } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
}));

import { GET } from "@/app/api/auth/callback/route";

function makeRequest(params: Record<string, string> = {}) {
	const url = new URL("http://localhost:3000/api/auth/callback");
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return new NextRequest(url);
}

function makeSupabaseClient(exchangeError: Error | null = null) {
	return {
		auth: {
			exchangeCodeForSession: vi
				.fn()
				.mockResolvedValue({ error: exchangeError }),
		},
	};
}

function redirectLocation(res: Response) {
	const raw = res.headers.get("location") ?? "";
	return new URL(raw);
}

describe("GET /api/auth/callback", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
	});

	it("redirects to /auth?error=missing_code when no code param", async () => {
		const res = await GET(makeRequest({ next: "/gallery" }));
		const loc = redirectLocation(res);
		expect(loc.pathname).toBe("/auth");
		expect(loc.searchParams.get("error")).toBe("missing_code");
	});

	it("does not call Supabase when code is missing", async () => {
		await GET(makeRequest());
		expect(createClientSSROnly).not.toHaveBeenCalled();
	});

	it("redirects to /auth?error=callback_failed when exchange fails", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient(new Error("oops")) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await GET(makeRequest({ code: "bad-code" }));
		const loc = redirectLocation(res);
		expect(loc.pathname).toBe("/auth");
		expect(loc.searchParams.get("error")).toBe("callback_failed");
	});

	it("calls Sentry.captureMessage on exchange failure", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient(new Error("oops")) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		await GET(makeRequest({ code: "bad-code" }));
		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			"auth.callback_exchange_failed",
			expect.objectContaining({ level: "warning" }),
		);
	});

	it("redirects to next path on success", async () => {
		const res = await GET(makeRequest({ code: "good-code", next: "/create" }));
		const loc = redirectLocation(res);
		expect(loc.pathname).toBe("/create");
	});

	it("falls back to /gallery when no next param on success", async () => {
		const res = await GET(makeRequest({ code: "good-code" }));
		const loc = redirectLocation(res);
		expect(loc.pathname).toBe("/gallery");
	});

	it("falls back to /gallery when next is an unsafe external URL", async () => {
		const res = await GET(
			makeRequest({ code: "good-code", next: "https://evil.com" }),
		);
		const loc = redirectLocation(res);
		expect(loc.pathname).toBe("/gallery");
	});

	it("falls back to /gallery when next starts with //", async () => {
		const res = await GET(
			makeRequest({ code: "good-code", next: "//evil.com" }),
		);
		const loc = redirectLocation(res);
		expect(loc.pathname).toBe("/gallery");
	});
});
