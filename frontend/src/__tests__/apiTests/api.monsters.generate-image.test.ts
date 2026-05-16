// ________
// Tests for src/app/api/monsters/[monsterId]/generate-image/route.ts
//
// These tests cover the orchestration logic of the route — auth checks,
// validation, and every branch of the generation pipeline. The individual
// abstraction modules (moderation, providers, storage) have their own unit
// tests; here they are all mocked so we only verify route-level wiring.
// ________

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// ─── Suppress server-only ────────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
	createClientSSROnly: vi.fn(),
}));

vi.mock("@/lib/django/fetchFromDjango", () => ({
	fetchFromDjango: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureEvent: vi.fn(),
	captureMessage: vi.fn(),
}));

vi.mock(
	"@/lib/monsterGeneration/imageGeneration/moderation/moderation",
	() => ({
		containsBannedTerms: vi.fn(),
		getModerationProvider: vi.fn(),
	}),
);

vi.mock("@/lib/monsterGeneration/imageGeneration/providers/providers", () => ({
	getImageProvider: vi.fn(),
}));

vi.mock("@/lib/monsterGeneration/imageGeneration/storage/storage", () => ({
	getImageStorage: vi.fn(),
}));

vi.mock("@/lib/env/env", () => ({
	env: { imageGenerationMode: "fake" },
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

import { POST } from "@/app/api/monsters/[monsterId]/generate-image/route";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import * as Sentry from "@sentry/nextjs";
import {
	containsBannedTerms,
	getModerationProvider,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderation";
import { getImageProvider } from "@/lib/monsterGeneration/imageGeneration/providers/providers";
import { getImageStorage } from "@/lib/monsterGeneration/imageGeneration/storage/storage";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MONSTER_ID = "00000000-0000-1000-8000-000000000001";
const JOB_ID = "00000000-0000-1000-8000-000000000002";
const ACCESS_TOKEN = "valid-access-token";
const USER_SUB = "00000000-0000-1000-8000-000000000003";
const PUBLIC_IMAGE_URL = "https://storage.example.com/image.png";
const STORAGE_PATH =
	`monster-images/${USER_SUB}/${MONSTER_ID}/img.png` as const;

const validFormBody = {
	display_name: "Blobsworth",
	element: "water",
	habitat: "swamp",
	personality: "grumpy",
	color_palette: "green and brown",
	flavor_text: "Lurks in the shallows.",
	should_email_when_done: false,
};

const mockQueuedJob = {
	id: JOB_ID,
	monster: MONSTER_ID,
	status: "queued",
	generation_mode: "fake",
	provider_info: {
		provider: "fake",
		provider_model: "fake",
		provider_request_id: "req-1",
	},
	generation_metadata: {
		prompt_version: "v1",
		prompt_hash: "abc123",
	},
	notify_when_done: {
		should_email_when_done: false,
		notified_at: null,
		notification_error: null,
	},
	error_info: null,
	image: null,
	timestamps: {
		created_at: "2025-01-01T00:00:00Z",
		started_at: null,
		finished_at: null,
		updated_at: "2025-01-01T00:00:00Z",
	},
};

// ─── Builder helpers ─────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
	return new NextRequest(
		`http://localhost:3000/api/monsters/${MONSTER_ID}/generate-image`,
		{
			method: "POST",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
		},
	);
}

function makeMalformedRequest() {
	return new NextRequest(
		`http://localhost:3000/api/monsters/${MONSTER_ID}/generate-image`,
		{
			method: "POST",
			body: "not json {{{{",
			headers: { "Content-Type": "application/json" },
		},
	);
}

function makeParams(id = MONSTER_ID) {
	return { params: Promise.resolve({ monsterId: id }) };
}

function makeSupabaseClient({
	claimsError = null as Error | null,
	sub = USER_SUB as string | null,
	accessToken = ACCESS_TOKEN as string | null,
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

/** Default Django mock: job create returns 201, all mark-* stubs return 501. */
function makeDefaultFetchFromDjango(jobOverride?: Record<string, unknown>) {
	return vi.fn().mockImplementation(async (path: string) => {
		if (path === "/api/image-generation-jobs/") {
			return {
				ok: true,
				status: 201,
				json: vi.fn().mockResolvedValue(jobOverride ?? mockQueuedJob),
			};
		}
		// All mark-* endpoints are 501 stubs
		return { ok: false, status: 501, json: vi.fn().mockResolvedValue(null) };
	});
}

/** Returns a provider that always succeeds. */
function makeSuccessProvider() {
	return {
		generate: vi.fn().mockResolvedValue({
			outcome: "success",
			imageBytes: Buffer.from("fake-image-bytes"),
			mimeType: "image/png",
		}),
	};
}

/** Returns a provider that always fails. */
function makeFailProvider() {
	return {
		generate: vi.fn().mockResolvedValue({
			outcome: "failed",
			safeErrorMessage: "Provider error.",
		}),
	};
}

/** Returns storage that always succeeds. */
function makeSuccessStorage() {
	return {
		upload: vi.fn().mockResolvedValue({
			outcome: "success",
			public_image_url: PUBLIC_IMAGE_URL,
			image_storage_path: STORAGE_PATH,
		}),
	};
}

/** Returns storage that always fails. */
function makeFailStorage() {
	return {
		upload: vi.fn().mockResolvedValue({
			outcome: "failed",
			safeErrorMessage: "Storage error.",
		}),
	};
}

/** Wire up the happy-path defaults for all mocks. */
function wireHappyPath() {
	vi.mocked(createClientSSROnly).mockResolvedValue(
		makeSupabaseClient() as unknown as Awaited<
			ReturnType<typeof createClientSSROnly>
		>,
	);
	vi.mocked(fetchFromDjango).mockImplementation(
		makeDefaultFetchFromDjango() as Mock,
	);
	vi.mocked(containsBannedTerms).mockReturnValue(false);
	vi.mocked(getModerationProvider).mockReturnValue({
		moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
	});
	vi.mocked(getImageProvider).mockReturnValue(makeSuccessProvider());
	vi.mocked(getImageStorage).mockReturnValue(makeSuccessStorage());
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("auth checks", () => {
	it("returns 401 when getClaims returns no sub", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({ sub: null }) as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("not_authenticated");
	});

	it("returns 401 when getClaims errors", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({
				claimsError: new Error("claims error"),
			}) as unknown as Awaited<ReturnType<typeof createClientSSROnly>>,
		);
		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(401);
	});

	it("returns 401 when access token is missing from session", async () => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient({
				accessToken: null,
			}) as unknown as Awaited<ReturnType<typeof createClientSSROnly>>,
		);
		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("missing_access_token");
	});
});

// ── Input validation ──────────────────────────────────────────────────────────

describe("input validation", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
	});

	it("returns 400 for malformed JSON", async () => {
		const res = await POST(makeMalformedRequest(), makeParams());
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_json");
	});

	it("returns 400 when body does not match monsterFormSchema", async () => {
		const res = await POST(
			makeRequest({ display_name: "" }), // missing required fields
			makeParams(),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("invalid_request");
	});
});

// ── Job creation ──────────────────────────────────────────────────────────────

describe("job creation failures", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
	});

	it("returns 500 when Django job create returns non-ok", async () => {
		vi.mocked(fetchFromDjango).mockResolvedValue({
			ok: false,
			status: 503,
			json: vi.fn().mockResolvedValue({}),
		} as unknown as Response);

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("job_create_failed");
		expect(vi.mocked(Sentry.captureEvent)).toHaveBeenCalledOnce();
	});

	it("returns 500 when Django job create response fails schema parse", async () => {
		vi.mocked(fetchFromDjango).mockResolvedValue({
			ok: true,
			status: 201,
			json: vi.fn().mockResolvedValue({ invalid: "shape" }),
		} as unknown as Response);

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("schema_mismatch");
	});

	it("returns 500 when fetchFromDjango throws (network error)", async () => {
		vi.mocked(fetchFromDjango).mockRejectedValue(new Error("Network error"));

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("upstream_error");
	});
});

// ── Content blocking ──────────────────────────────────────────────────────────

describe("content blocking", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		vi.mocked(fetchFromDjango).mockImplementation(
			makeDefaultFetchFromDjango() as Mock,
		);
	});

	it("returns 422 and calls mark-blocked when banned terms are detected", async () => {
		vi.mocked(containsBannedTerms).mockReturnValue(true);

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.error.code).toBe("content_blocked");
	});

	it("does NOT call Sentry when banned terms block a prompt", async () => {
		vi.mocked(containsBannedTerms).mockReturnValue(true);

		await POST(makeRequest(validFormBody), makeParams());
		expect(vi.mocked(Sentry.captureEvent)).not.toHaveBeenCalled();
	});

	it("calls mark-blocked endpoint when banned terms are detected", async () => {
		vi.mocked(containsBannedTerms).mockReturnValue(true);

		await POST(makeRequest(validFormBody), makeParams());

		const calls = vi
			.mocked(fetchFromDjango)
			.mock.calls.map(([path]) => path as string);
		expect(calls.some((p) => p.includes("mark-blocked"))).toBe(true);
	});

	it("returns 422 and calls mark-blocked when moderation provider blocks", async () => {
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi
				.fn()
				.mockResolvedValue({ outcome: "blocked", safeReason: "NSFW content." }),
		});

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.error.code).toBe("content_blocked");
	});

	it("does NOT call Sentry when moderation provider blocks", async () => {
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi
				.fn()
				.mockResolvedValue({ outcome: "blocked", safeReason: "NSFW content." }),
		});

		await POST(makeRequest(validFormBody), makeParams());
		expect(vi.mocked(Sentry.captureEvent)).not.toHaveBeenCalled();
	});

	it("returns 500 and calls Sentry when moderation provider fails", async () => {
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({
				outcome: "failed",
				safeErrorMessage: "Moderation service unavailable.",
			}),
		});

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("moderation_failed");
		expect(vi.mocked(Sentry.captureEvent)).toHaveBeenCalledOnce();
		const sentryCall = vi.mocked(Sentry.captureEvent).mock.calls[0][0];
		expect(sentryCall.tags).toMatchObject({ error_code: "moderation_failed" });
	});
});

// ── Provider failure ──────────────────────────────────────────────────────────

describe("image provider failure", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		vi.mocked(fetchFromDjango).mockImplementation(
			makeDefaultFetchFromDjango() as Mock,
		);
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
	});

	it("returns 500 and calls Sentry when provider fails", async () => {
		vi.mocked(getImageProvider).mockReturnValue(makeFailProvider());

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("provider_failed");
		expect(vi.mocked(Sentry.captureEvent)).toHaveBeenCalledOnce();
	});

	it("calls mark-failed when provider fails", async () => {
		vi.mocked(getImageProvider).mockReturnValue(makeFailProvider());

		await POST(makeRequest(validFormBody), makeParams());

		const calls = vi
			.mocked(fetchFromDjango)
			.mock.calls.map(([path]) => path as string);
		expect(calls.some((p) => p.includes("mark-failed"))).toBe(true);
	});

	it("does NOT call storage when provider fails", async () => {
		vi.mocked(getImageProvider).mockReturnValue(makeFailProvider());
		vi.mocked(getImageStorage).mockReturnValue(makeSuccessStorage());

		await POST(makeRequest(validFormBody), makeParams());

		expect(vi.mocked(getImageStorage)().upload).not.toHaveBeenCalled();
	});
});

// ── Storage failure ───────────────────────────────────────────────────────────

describe("storage failure", () => {
	beforeEach(() => {
		vi.mocked(createClientSSROnly).mockResolvedValue(
			makeSupabaseClient() as unknown as Awaited<
				ReturnType<typeof createClientSSROnly>
			>,
		);
		vi.mocked(fetchFromDjango).mockImplementation(
			makeDefaultFetchFromDjango() as Mock,
		);
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue(makeSuccessProvider());
	});

	it("returns 500 and calls Sentry when storage fails", async () => {
		vi.mocked(getImageStorage).mockReturnValue(makeFailStorage());

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe("storage_failed");
		expect(vi.mocked(Sentry.captureEvent)).toHaveBeenCalledOnce();
	});

	it("calls mark-failed when storage fails", async () => {
		vi.mocked(getImageStorage).mockReturnValue(makeFailStorage());

		await POST(makeRequest(validFormBody), makeParams());

		const calls = vi
			.mocked(fetchFromDjango)
			.mock.calls.map(([path]) => path as string);
		expect(calls.some((p) => p.includes("mark-failed"))).toBe(true);
	});
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe("happy path", () => {
	it("returns 200 with outcome, public_image_url, and image_storage_path on success", async () => {
		wireHappyPath();

		const res = await POST(makeRequest(validFormBody), makeParams());
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.outcome).toBe("succeeded");
		expect(body.public_image_url).toBe(PUBLIC_IMAGE_URL);
		expect(body.image_storage_path).toBe(STORAGE_PATH);
	});

	it("calls mark-running and mark-succeeded on the happy path", async () => {
		wireHappyPath();

		await POST(makeRequest(validFormBody), makeParams());

		const calls = vi
			.mocked(fetchFromDjango)
			.mock.calls.map(([path]) => path as string);
		expect(calls.some((p) => p.includes("mark-running"))).toBe(true);
		expect(calls.some((p) => p.includes("mark-succeeded"))).toBe(true);
	});

	it("creates the job with the monsterId from the route params", async () => {
		wireHappyPath();

		await POST(makeRequest(validFormBody), makeParams());

		const jobCreateCall = vi
			.mocked(fetchFromDjango)
			.mock.calls.find(([path]) => path === "/api/image-generation-jobs/");
		expect(jobCreateCall).toBeDefined();
		const jobBody = JSON.parse(
			(jobCreateCall![1] as RequestInit).body as string,
		);
		expect(jobBody.monster_id).toBe(MONSTER_ID);
	});

	it("passes should_email_when_done from the request body to the job create call", async () => {
		wireHappyPath();

		await POST(
			makeRequest({ ...validFormBody, should_email_when_done: true }),
			makeParams(),
		);

		const jobCreateCall = vi
			.mocked(fetchFromDjango)
			.mock.calls.find(([path]) => path === "/api/image-generation-jobs/");
		const jobBody = JSON.parse(
			(jobCreateCall![1] as RequestInit).body as string,
		);
		expect(jobBody.should_email_when_done).toBe(true);
	});
});
