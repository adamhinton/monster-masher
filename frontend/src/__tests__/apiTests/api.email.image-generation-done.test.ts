// ________
// Tests for src/app/api/email/image-generation-done/route.ts
// POST /api/email/image-generation-done
// ________

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

// Resend is a class — mock it so `new Resend(key)` returns an object with a
// controllable `emails.send` spy.
const mockEmailsSend = vi.fn();
vi.mock("resend", () => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Resend: vi.fn().mockImplementation(function (this: any) {
		this.emails = { send: mockEmailsSend };
	}),
}));

vi.mock("@sentry/nextjs", () => ({
	captureEvent: vi.fn(),
}));

vi.mock("@/lib/env/env", () => ({
	env: {
		resendApiKey: "test-resend-key",
		appUrl: "https://monstermash.io",
	},
}));

vi.mock(
	"@/components/emailTemplatesToUser/imageGenerationDone/ImageGenerationSuccess",
	() => ({
		ImageGenerationDoneEmail: vi.fn(() => null),
	}),
);

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { POST } from "@/app/api/email/image-generation-done/route";
import { createClientSSROnly } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_EMAIL = "user@example.com";
const ACCESS_TOKEN = "valid-token";

function makeRequest(
	body: unknown,
	headers: Record<string, string> = {},
): NextRequest {
	return {
		nextUrl: new URL("http://localhost:3000/api/email/image-generation-done"),
		headers: {
			get: (name: string) => headers[name.toLowerCase()] ?? null,
		},
		json: () => Promise.resolve(body),
	} as unknown as NextRequest;
}

function makeRequestWithAuth(
	body: unknown,
	token: string = ACCESS_TOKEN,
): NextRequest {
	return makeRequest(body, { authorization: `Bearer ${token}` });
}

function makeSupabaseClient(
	user: { email: string } | null = { email: USER_EMAIL },
) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user },
				error: user ? null : new Error("invalid token"),
			}),
		},
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/email/image-generation-done", () => {
	beforeEach(() => {
		resetRateLimitForTests();
		mockEmailsSend.mockClear();
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		mockEmailsSend.mockResolvedValue({ data: { id: "msg-123" }, error: null });
	});

	// ── Auth ──────────────────────────────────────────────────────────────────

	it("returns 401 when Authorization header is absent", async () => {
		const res = await POST(
			makeRequest({ email: USER_EMAIL, scenario: "succeeded" }),
		);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	it("returns 403 for cross-site browser requests", async () => {
		const res = await POST(
			makeRequest(
				{ email: USER_EMAIL, scenario: "succeeded" },
				{
					authorization: `Bearer ${ACCESS_TOKEN}`,
					origin: "https://evil.example",
					"sec-fetch-site": "cross-site",
				},
			),
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("cross_site_request");
		expect(mockEmailsSend).not.toHaveBeenCalled();
	});

	it("returns 401 when the JWT is invalid", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient(null) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST(
			makeRequestWithAuth({ email: USER_EMAIL, scenario: "succeeded" }),
		);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	// ── Validation ────────────────────────────────────────────────────────────

	it("returns 400 for invalid JSON", async () => {
		const badRequest = {
			nextUrl: new URL("http://localhost:3000/api/email/image-generation-done"),
			headers: {
				get: (name: string) =>
					name.toLowerCase() === "authorization"
						? `Bearer ${ACCESS_TOKEN}`
						: null,
			},
			json: () => Promise.reject(new SyntaxError("bad json")),
		} as unknown as NextRequest;

		const res = await POST(badRequest);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_json");
	});

	it("returns 400 when scenario is missing", async () => {
		const res = await POST(makeRequestWithAuth({ email: USER_EMAIL }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_request");
	});

	it("returns 400 when email is not a valid address", async () => {
		const res = await POST(
			makeRequestWithAuth({ email: "not-an-email", scenario: "succeeded" }),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_request");
	});

	it("returns 400 when scenario is an unknown value", async () => {
		const res = await POST(
			makeRequestWithAuth({
				email: USER_EMAIL,
				scenario: "failed/unknown-scenario",
			}),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_request");
	});

	// ── Email ownership ───────────────────────────────────────────────────────

	it("returns 403 when the request email does not match the JWT user", async () => {
		const res = await POST(
			makeRequestWithAuth({
				email: "other@example.com",
				scenario: "succeeded",
			}),
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("email_mismatch");
	});

	// ── Success paths ─────────────────────────────────────────────────────────

	it("returns 200 with messageId on success (succeeded)", async () => {
		const res = await POST(
			makeRequestWithAuth({ email: USER_EMAIL, scenario: "succeeded" }),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.messageId).toBe("msg-123");
	});

	it("returns 200 with messageId on success (failed/moderation)", async () => {
		const res = await POST(
			makeRequestWithAuth({
				email: USER_EMAIL,
				scenario: "failed/moderation",
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	it("returns 200 on success (failed/network-error)", async () => {
		const res = await POST(
			makeRequestWithAuth({
				email: USER_EMAIL,
				scenario: "failed/network-error",
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	it("returns 200 on success (failed/unspecified)", async () => {
		const res = await POST(
			makeRequestWithAuth({
				email: USER_EMAIL,
				scenario: "failed/unspecified",
			}),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	it("passes monsterName through to the email template when provided", async () => {
		await POST(
			makeRequestWithAuth({
				email: USER_EMAIL,
				scenario: "succeeded",
				monsterName: "Grumblor",
			}),
		);

		expect(mockEmailsSend).toHaveBeenCalledWith(
			expect.objectContaining({
				to: [USER_EMAIL],
			}),
		);
	});

	// ── Resend failure ────────────────────────────────────────────────────────

	it("returns 500 and fires Sentry alert when Resend returns an error", async () => {
		mockEmailsSend.mockResolvedValueOnce({
			data: null,
			error: { message: "Resend delivery failed" },
		});

		const res = await POST(
			makeRequestWithAuth({ email: USER_EMAIL, scenario: "succeeded" }),
		);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.code).toBe("resend_error");

		expect(Sentry.captureEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "image_generation_done_email.send_failed",
				level: "error",
			}),
		);
	});

	it("fires Sentry alert with the failing scenario in tags", async () => {
		mockEmailsSend.mockResolvedValueOnce({
			data: null,
			error: { message: "oops" },
		});

		await POST(
			makeRequestWithAuth({
				email: USER_EMAIL,
				scenario: "failed/moderation",
			}),
		);

		expect(Sentry.captureEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				tags: expect.objectContaining({
					email_scenario: "failed/moderation",
				}),
			}),
		);
	});
});
