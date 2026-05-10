// ________
// Tests for src/app/api/auth/sign-in/route.ts  (POST /api/auth/sign-in)
// ________
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createClientSSROnly } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

import { POST } from "@/app/api/auth/sign-in/route";

const mockSignInWithOtp = vi.fn();

function makeSupabaseClient(otpError: Error | null = null) {
	return {
		auth: {
			signInWithOtp: mockSignInWithOtp.mockResolvedValue({
				error: otpError,
			}),
		},
	};
}

function makeRequest(body: unknown, contentType = "application/json") {
	return new NextRequest("http://localhost:3000/api/auth/sign-in", {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": contentType },
	});
}

describe("POST /api/auth/sign-in", () => {
	beforeEach(() => {
		mockSignInWithOtp.mockReset();
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
	});

	it("returns 400 invalid_json for a non-JSON body", async () => {
		const res = await POST(makeRequest("not json", "text/plain"));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_json");
	});

	it("returns 400 invalid_request for an invalid email", async () => {
		const res = await POST(makeRequest({ email: "notanemail" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_request");
	});

	it("returns 200 { ok: true } for a valid email", async () => {
		const res = await POST(makeRequest({ email: "user@example.com" }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true });
	});

	it("calls signInWithOtp with the correct email (normalised to lowercase)", async () => {
		await POST(makeRequest({ email: "USER@Example.com" }));
		expect(mockSignInWithOtp).toHaveBeenCalledWith(
			expect.objectContaining({ email: "user@example.com" }),
		);
	});

	it("includes next path (encoded) in emailRedirectTo", async () => {
		await POST(makeRequest({ email: "user@example.com", next: "/create" }));
		expect(mockSignInWithOtp).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					emailRedirectTo: expect.stringContaining(
						encodeURIComponent("/create"),
					),
				}),
			}),
		);
	});

	it("falls back to /gallery in emailRedirectTo when next is unsafe", async () => {
		await POST(
			makeRequest({ email: "user@example.com", next: "https://evil.com" }),
		);
		expect(mockSignInWithOtp).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					emailRedirectTo: expect.stringContaining(
						encodeURIComponent("/gallery"),
					),
				}),
			}),
		);
	});

	it("returns 400 sign_in_failed when OTP call errors", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient(new Error("supabase down")) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST(makeRequest({ email: "user@example.com" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("sign_in_failed");
	});
});
