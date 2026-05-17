// ________
// Tests for src/app/api/monsters/route.ts  (POST /api/monsters/)
// ________
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import * as Sentry from "@sentry/nextjs";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

vi.mock("@/lib/django/fetchFromDjango", () => ({
	fetchFromDjango: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

import { POST } from "@/app/api/monsters/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validMonsterPayload = {
	display_name: "Blobsworth",
	traits: {
		element: "water",
		habitat: "swamp",
		personality: "grumpy",
		color_palette: "green and brown",
	},
	flavor_text: "Lurks in the shallows.",
	should_email_when_done: true,
};

const validMonsterResponse: Monster = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	display_name: "Blobsworth",
	traits: {
		element: "water",
		habitat: "swamp",
		personality: "grumpy",
		color_palette: "green and brown",
	},
	flavor_text: "Lurks in the shallows.",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-01T00:00:00.000Z",
	image: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
	return new NextRequest("http://localhost:3000/api/monsters/", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

function makeMalformedRequest() {
	return new NextRequest("http://localhost:3000/api/monsters/", {
		method: "POST",
		body: "not json {{{{",
		headers: { "Content-Type": "application/json" },
	});
}

function makeSupabaseClient({
	claimsError = null as Error | null,
	sub = "some-supabase-user-id" as string | null,
	accessToken = "valid-access-token" as string | null,
} = {}) {
	return {
		auth: {
			getClaims: vi.fn().mockResolvedValue({
				data: sub !== null ? { claims: { sub } } : null,
				error: claimsError,
			}),
			getSession: vi.fn().mockResolvedValue({
				data: {
					session: accessToken !== null ? { access_token: accessToken } : null,
				},
				error: null,
			}),
		},
	};
}

function makeDjangoResponse(body: unknown, status = 201) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: vi.fn().mockResolvedValue(body),
	} as unknown as Response;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/monsters/", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		vi.mocked(fetchFromDjango).mockResolvedValue(
			makeDjangoResponse(validMonsterResponse),
		);
	});

	// ── Auth checks ────────────────────────────────────────────────────────────

	it("returns 401 not_authenticated when getClaims errors", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({
				claimsError: new Error("jwt expired"),
			}) as unknown as Awaited<ReturnType<typeof createClientSSROnly>>,
		);
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	it("returns 401 not_authenticated when claims has no sub", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({ sub: null }) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	it("returns 401 missing_access_token when session has no token", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({ accessToken: null }) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("missing_access_token");
	});

	// ── Request body validation ────────────────────────────────────────────────

	it("returns 400 invalid_json when body is malformed JSON", async () => {
		const res = await POST(makeMalformedRequest());
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_json");
	});

	it("returns 400 invalid_monster_data when display_name is missing", async () => {
		const res = await POST(makeRequest({ traits: validMonsterPayload.traits }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	it("returns 400 invalid_monster_data when traits is missing", async () => {
		const res = await POST(makeRequest({ display_name: "Blobsworth" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	it("returns 400 invalid_monster_data when a required trait field is missing", async () => {
		const res = await POST(
			makeRequest({
				display_name: "Blobsworth",
				traits: { element: "fire" }, // habitat, personality, color_palette missing
			}),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	it("returns 400 invalid_monster_data when display_name exceeds max length", async () => {
		const res = await POST(
			makeRequest({
				...validMonsterPayload,
				display_name: "x".repeat(81),
			}),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	it("returns 400 invalid_monster_data when element exceeds max length", async () => {
		const res = await POST(
			makeRequest({
				...validMonsterPayload,
				traits: { ...validMonsterPayload.traits, element: "x".repeat(21) },
			}),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	it("returns 400 invalid_monster_data when body is an empty object", async () => {
		const res = await POST(makeRequest({}));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	it("returns 400 invalid_monster_data when body is null", async () => {
		const res = await POST(makeRequest(null));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_monster_data");
	});

	// ── Upstream / Django errors ───────────────────────────────────────────────

	it("returns 503 upstream_error when fetchFromDjango throws", async () => {
		vi.mocked(fetchFromDjango).mockRejectedValueOnce(
			new TypeError("fetch failed"),
		);
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.error.code).toBe("upstream_error");
	});

	it("calls Sentry.captureException when fetchFromDjango throws", async () => {
		vi.mocked(fetchFromDjango).mockRejectedValueOnce(
			new TypeError("fetch failed"),
		);
		await POST(makeRequest(validMonsterPayload));
		expect(Sentry.captureException).toHaveBeenCalled();
	});

	it("returns Django status code when Django returns a non-ok response", async () => {
		vi.mocked(fetchFromDjango).mockResolvedValueOnce(
			makeDjangoResponse({ detail: "bad request" }, 400),
		);
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("django_error");
	});

	it("calls Sentry.captureMessage when Django returns non-ok", async () => {
		vi.mocked(fetchFromDjango).mockResolvedValueOnce(
			makeDjangoResponse({ detail: "server error" }, 500),
		);
		await POST(makeRequest(validMonsterPayload));
		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			"monsters.create_failed",
			expect.objectContaining({ level: "warning" }),
		);
	});

	it("returns 500 schema_mismatch when Django response does not match MonsterSchema", async () => {
		vi.mocked(fetchFromDjango).mockResolvedValueOnce(
			makeDjangoResponse({ unexpected: "shape" }, 201),
		);
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("schema_mismatch");
	});

	it("calls Sentry.captureMessage on schema mismatch", async () => {
		vi.mocked(fetchFromDjango).mockResolvedValueOnce(
			makeDjangoResponse({ unexpected: "shape" }, 201),
		);
		await POST(makeRequest(validMonsterPayload));
		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			"monsters.create_schema_mismatch",
			expect.objectContaining({ level: "error" }),
		);
	});

	// ── Success ───────────────────────────────────────────────────────────────

	it("returns 201 with { monster } on success", async () => {
		const res = await POST(makeRequest(validMonsterPayload));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.monster).toMatchObject({
			id: validMonsterResponse.id,
			display_name: "Blobsworth",
			traits: validMonsterPayload.traits,
		});
	});

	it("forwards the access token to Django as a Bearer header", async () => {
		await POST(makeRequest(validMonsterPayload));
		expect(fetchFromDjango).toHaveBeenCalledWith(
			"/api/monsters/",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer valid-access-token",
				}),
			}),
		);
	});

	it("sends the monster payload as JSON to Django", async () => {
		await POST(makeRequest(validMonsterPayload));
		expect(fetchFromDjango).toHaveBeenCalledWith(
			"/api/monsters/",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify(validMonsterPayload),
			}),
		);
	});

	it("accepts a monster without optional flavor_text", async () => {
		const payloadNoFlavor = {
			display_name: "Sparky",
			traits: {
				element: "fire",
				habitat: "volcano",
				personality: "bold",
				color_palette: "red and orange",
			},
		};
		const responseNoFlavor: Monster = {
			...validMonsterResponse,
			display_name: "Sparky",
			traits: payloadNoFlavor.traits,
			flavor_text: undefined,
		};
		vi.mocked(fetchFromDjango).mockResolvedValueOnce(
			makeDjangoResponse(responseNoFlavor),
		);
		const res = await POST(makeRequest(payloadNoFlavor));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.monster.display_name).toBe("Sparky");
	});

	it("does not call Django when request body is invalid", async () => {
		await POST(makeRequest({ display_name: "bad" }));
		expect(fetchFromDjango).not.toHaveBeenCalled();
	});

	it("does not call Django when unauthenticated", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({ sub: null }) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		await POST(makeRequest(validMonsterPayload));
		expect(fetchFromDjango).not.toHaveBeenCalled();
	});
});
