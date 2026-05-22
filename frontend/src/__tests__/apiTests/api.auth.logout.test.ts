// ________
// Tests for src/app/api/auth/logout/route.ts  (POST /api/auth/logout)
// ________
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createClientSSROnly } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
}));

import { POST } from "@/app/api/auth/logout/route";

function makeRequest(headers: Record<string, string> = {}) {
	return new NextRequest("http://localhost:3000/api/auth/logout", {
		method: "POST",
		headers,
	});
}

function makeSupabaseClient(signOutError: Error | null = null) {
	return {
		auth: {
			signOut: vi.fn().mockResolvedValue({ error: signOutError }),
		},
	};
}

describe("POST /api/auth/logout", () => {
	beforeEach(() => {
		resetRateLimitForTests();
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
	});

	it("returns 200 { ok: true } on success", async () => {
		const res = await POST(makeRequest());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true });
	});

	it("returns 500 with error shape when signOut fails", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient(new Error("supabase problem")) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST(makeRequest());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBeDefined();
		expect(body.error.code).toBe("logout_failed");
	});

	it("calls Sentry.captureMessage when signOut fails", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient(new Error("supabase problem")) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		await POST(makeRequest());
		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			"auth.logout_failed",
			expect.objectContaining({ level: "warning" }),
		);
	});

	it("returns 403 for cross-site browser requests", async () => {
		const res = await POST(
			makeRequest({
				Origin: "https://evil.example",
				"Sec-Fetch-Site": "cross-site",
			}),
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("cross_site_request");
	});
});
