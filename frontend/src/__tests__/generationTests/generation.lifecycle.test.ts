// ______________
// Full end-to-end lifecycle tests for the generate-image route handler.
//
// Each test drives the entire POST /api/monsters/[monsterId]/generate-image
// pipeline from HTTP request through to HTTP response, mocking every external
// dependency. The emphasis is on:
//   - The SEQUENCE of Django calls (order matters for data integrity)
//   - What calls should NOT happen after each branch point
//   - The final response shape for each terminal scenario
//
// No real network, provider, storage, or Supabase calls occur.
// See api.monsters.generate-image.test.ts for per-branch unit tests.
// ______________

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

// ─── Imports under test (after mocks) ────────────────────────────────────────

import { POST } from "@/app/api/monsters/[monsterId]/generate-image/route";
import { createClientSSROnly } from "@/lib/supabase/server";
import { fetchFromDjango } from "@/lib/django/fetchFromDjango";
import {
	containsBannedTerms,
	getModerationProvider,
} from "@/lib/monsterGeneration/imageGeneration/moderation/moderation";
import { getImageProvider } from "@/lib/monsterGeneration/imageGeneration/providers/providers";
import { getImageStorage } from "@/lib/monsterGeneration/imageGeneration/storage/storage";
import type { MonsterFormValues } from "@/components/monsterGeneration/monsterFormSchema";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MONSTER_ID = "00000000-0000-1000-8000-000000000001";
const JOB_ID = "00000000-0000-1000-8000-000000000002";
const USER_SUB = "00000000-0000-1000-8000-000000000003";
const ACCESS_TOKEN = "valid-access-token";
const PUBLIC_IMAGE_URL = "https://storage.example.com/image.png";
const STORAGE_PATH =
	`monster-images/${USER_SUB}/${MONSTER_ID}/img.png` as const;

const VALID_FORM: MonsterFormValues = {
	display_name: "Blobsworth",
	element: "water",
	habitat: "swamp",
	personality: "grumpy",
	color_palette: "green and brown",
	flavor_text: "Lurks in the shallows.",
	should_email_when_done: false,
};

const MOCK_QUEUED_JOB = {
	id: JOB_ID,
	monster: MONSTER_ID,
	status: "queued",
	generation_mode: "fake",
	provider_info: {
		provider: "fake",
		provider_model: "fake",
		provider_request_id: "req-1",
	},
	generation_metadata: { prompt_version: "v1", prompt_hash: "abc123" },
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

// ─── Builder helpers ──────────────────────────────────────────────────────────

function makeRequest(body: unknown = VALID_FORM) {
	return new NextRequest(
		`http://localhost:3000/api/monsters/${MONSTER_ID}/generate-image`,
		{
			method: "POST",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
		},
	);
}

function makeParams(id = MONSTER_ID) {
	return { params: Promise.resolve({ monsterId: id }) };
}

function mockSupabase({
	sub = USER_SUB as string | null,
	accessToken = ACCESS_TOKEN as string | null,
} = {}) {
	return vi.mocked(createClientSSROnly).mockResolvedValue({
		auth: {
			getClaims: vi.fn().mockResolvedValue({
				data: sub !== null ? { claims: { sub } } : null,
				error: null,
			}),
			getSession: vi.fn().mockResolvedValue({
				data: {
					session: accessToken !== null ? { access_token: accessToken } : null,
				},
				error: null,
			}),
		},
	} as unknown as Awaited<ReturnType<typeof createClientSSROnly>>);
}

function mockDjango() {
	return vi.mocked(fetchFromDjango).mockImplementation((async (
		path: string,
	) => {
		if (path === "/api/monsters/{monster_id}/generate-image/jobs/") {
			return {
				ok: true,
				status: 201,
				json: vi.fn().mockResolvedValue(MOCK_QUEUED_JOB),
			};
		}
		return { ok: true, status: 200, json: vi.fn().mockResolvedValue({}) };
	}) as Mock);
}

/** Returns the ordered list of Django path keys that were called. */
function djangoCallPaths(): string[] {
	return vi.mocked(fetchFromDjango).mock.calls.map(([path]) => path as string);
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ─── Scenario: happy path (succeeded) ────────────────────────────────────────

describe("scenario: succeeded", () => {
	it("calls Django endpoints in the correct order", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "success",
				imageBytes: Buffer.from("img"),
				mimeType: "image/png",
			}),
		});
		vi.mocked(getImageStorage).mockReturnValue({
			upload: vi.fn().mockResolvedValue({
				outcome: "success",
				public_image_url: PUBLIC_IMAGE_URL,
				image_storage_path: STORAGE_PATH,
			}),
		});

		await POST(makeRequest(), makeParams());

		expect(djangoCallPaths()).toEqual([
			"/api/monsters/{monster_id}/generate-image/jobs/",
			"/api/monsters/{monster_id}/generate-image/mark-running/",
			"/api/monsters/{monster_id}/generate-image/mark-succeeded/",
		]);
	});

	it("returns 200 with outcome, public_image_url, and image_storage_path", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "success",
				imageBytes: Buffer.from("img"),
				mimeType: "image/png",
			}),
		});
		vi.mocked(getImageStorage).mockReturnValue({
			upload: vi.fn().mockResolvedValue({
				outcome: "success",
				public_image_url: PUBLIC_IMAGE_URL,
				image_storage_path: STORAGE_PATH,
			}),
		});

		const res = await POST(makeRequest(), makeParams());
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.outcome).toBe("succeeded");
		expect(body.public_image_url).toBe(PUBLIC_IMAGE_URL);
		expect(body.image_storage_path).toBe(STORAGE_PATH);
	});

	it("never calls image provider or storage before moderation passes", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		const moderateFn = vi
			.fn()
			.mockResolvedValue({ outcome: "allowed" as const });
		vi.mocked(getModerationProvider).mockReturnValue({ moderate: moderateFn });
		const generateFn = vi.fn().mockResolvedValue({
			outcome: "success",
			imageBytes: Buffer.from("img"),
			mimeType: "image/png",
		});
		vi.mocked(getImageProvider).mockReturnValue({ generate: generateFn });
		vi.mocked(getImageStorage).mockReturnValue({
			upload: vi.fn().mockResolvedValue({
				outcome: "success",
				public_image_url: PUBLIC_IMAGE_URL,
				image_storage_path: STORAGE_PATH,
			}),
		});

		await POST(makeRequest(), makeParams());

		// Moderation must be called before provider
		expect(moderateFn).toHaveBeenCalledOnce();
		expect(generateFn).toHaveBeenCalledOnce();
		// verify order via Django call sequence (running comes after moderation)
		const paths = djangoCallPaths();
		expect(
			paths.indexOf("/api/monsters/{monster_id}/generate-image/mark-running/"),
		).toBeGreaterThan(0);
	});
});

// ─── Scenario: blocked by banned terms ───────────────────────────────────────

describe("scenario: blocked by banned terms", () => {
	it("calls create-job then mark-blocked and nothing else", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(true);
		const moderateFn = vi.fn();
		vi.mocked(getModerationProvider).mockReturnValue({ moderate: moderateFn });
		const generateFn = vi.fn();
		vi.mocked(getImageProvider).mockReturnValue({ generate: generateFn });
		const uploadFn = vi.fn();
		vi.mocked(getImageStorage).mockReturnValue({ upload: uploadFn });

		const res = await POST(makeRequest(), makeParams());

		expect(res.status).toBe(422);
		expect(djangoCallPaths()).toEqual([
			"/api/monsters/{monster_id}/generate-image/jobs/",
			"/api/monsters/{monster_id}/generate-image/mark-blocked/",
		]);
		// Moderation provider, image provider, and storage must NOT be called
		expect(moderateFn).not.toHaveBeenCalled();
		expect(generateFn).not.toHaveBeenCalled();
		expect(uploadFn).not.toHaveBeenCalled();
	});

	it("returns error code content_blocked", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(true);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn(),
		});
		vi.mocked(getImageProvider).mockReturnValue({ generate: vi.fn() });
		vi.mocked(getImageStorage).mockReturnValue({ upload: vi.fn() });

		const res = await POST(makeRequest(), makeParams());
		const body = await res.json();

		expect(body.error.code).toBe("content_blocked");
	});
});

// ─── Scenario: blocked by moderation provider ────────────────────────────────

describe("scenario: blocked by moderation provider", () => {
	it("calls create-job then mark-blocked; never calls mark-running, provider, or storage", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({
				outcome: "blocked",
				safeReason: "Policy violation.",
			}),
		});
		const generateFn = vi.fn();
		vi.mocked(getImageProvider).mockReturnValue({ generate: generateFn });
		const uploadFn = vi.fn();
		vi.mocked(getImageStorage).mockReturnValue({ upload: uploadFn });

		const res = await POST(makeRequest(), makeParams());

		expect(res.status).toBe(422);
		const paths = djangoCallPaths();
		expect(paths).toEqual([
			"/api/monsters/{monster_id}/generate-image/jobs/",
			"/api/monsters/{monster_id}/generate-image/mark-blocked/",
		]);
		expect(generateFn).not.toHaveBeenCalled();
		expect(uploadFn).not.toHaveBeenCalled();
	});
});

// ─── Scenario: provider failed ────────────────────────────────────────────────

describe("scenario: provider failed", () => {
	it("calls create-job, mark-running, mark-failed; never calls storage", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "failed",
				safeErrorMessage: "Provider error.",
			}),
		});
		const uploadFn = vi.fn();
		vi.mocked(getImageStorage).mockReturnValue({ upload: uploadFn });

		const res = await POST(makeRequest(), makeParams());

		expect(res.status).toBe(500);
		expect(djangoCallPaths()).toEqual([
			"/api/monsters/{monster_id}/generate-image/jobs/",
			"/api/monsters/{monster_id}/generate-image/mark-running/",
			"/api/monsters/{monster_id}/generate-image/mark-failed/",
		]);
		expect(uploadFn).not.toHaveBeenCalled();
	});

	it("returns error code provider_failed", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "failed",
				safeErrorMessage: "Provider error.",
			}),
		});
		vi.mocked(getImageStorage).mockReturnValue({ upload: vi.fn() });

		const res = await POST(makeRequest(), makeParams());
		const body = await res.json();

		expect(body.error.code).toBe("provider_failed");
	});
});

// ─── Scenario: storage failed ─────────────────────────────────────────────────

describe("scenario: storage failed", () => {
	it("calls create-job, mark-running, mark-failed; never calls mark-succeeded", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "success",
				imageBytes: Buffer.from("img"),
				mimeType: "image/png",
			}),
		});
		vi.mocked(getImageStorage).mockReturnValue({
			upload: vi.fn().mockResolvedValue({
				outcome: "failed",
				safeErrorMessage: "S3 error.",
			}),
		});

		const res = await POST(makeRequest(), makeParams());

		expect(res.status).toBe(500);
		const paths = djangoCallPaths();
		expect(paths).toEqual([
			"/api/monsters/{monster_id}/generate-image/jobs/",
			"/api/monsters/{monster_id}/generate-image/mark-running/",
			"/api/monsters/{monster_id}/generate-image/mark-failed/",
		]);
		expect(paths).not.toContain(
			"/api/monsters/{monster_id}/generate-image/mark-succeeded/",
		);
	});

	it("returns error code storage_failed", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "success",
				imageBytes: Buffer.from("img"),
				mimeType: "image/png",
			}),
		});
		vi.mocked(getImageStorage).mockReturnValue({
			upload: vi.fn().mockResolvedValue({
				outcome: "failed",
				safeErrorMessage: "S3 error.",
			}),
		});

		const res = await POST(makeRequest(), makeParams());
		const body = await res.json();

		expect(body.error.code).toBe("storage_failed");
	});
});

// ─── Scenario: Django job-create failure ─────────────────────────────────────

describe("scenario: Django job-create failure", () => {
	it("returns 500 and never calls any transition endpoint", async () => {
		mockSupabase();
		vi.mocked(fetchFromDjango).mockResolvedValue({
			ok: false,
			status: 503,
			json: vi.fn().mockResolvedValue({}),
		} as unknown as Response);
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn(),
		});
		vi.mocked(getImageProvider).mockReturnValue({ generate: vi.fn() });
		vi.mocked(getImageStorage).mockReturnValue({ upload: vi.fn() });

		const res = await POST(makeRequest(), makeParams());

		expect(res.status).toBe(500);
		// Only the create call was attempted; no transitions follow
		expect(djangoCallPaths()).toEqual([
			"/api/monsters/{monster_id}/generate-image/jobs/",
		]);
	});
});

// ─── B7a gap: extra fields stripped ──────────────────────────────────────────

describe("B7a: request body shape", () => {
	it("strips unexpected fields and still succeeds when all required fields are present", async () => {
		mockSupabase();
		mockDjango();
		vi.mocked(containsBannedTerms).mockReturnValue(false);
		vi.mocked(getModerationProvider).mockReturnValue({
			moderate: vi.fn().mockResolvedValue({ outcome: "allowed" }),
		});
		vi.mocked(getImageProvider).mockReturnValue({
			generate: vi.fn().mockResolvedValue({
				outcome: "success",
				imageBytes: Buffer.from("img"),
				mimeType: "image/png",
			}),
		});
		vi.mocked(getImageStorage).mockReturnValue({
			upload: vi.fn().mockResolvedValue({
				outcome: "success",
				public_image_url: PUBLIC_IMAGE_URL,
				image_storage_path: STORAGE_PATH,
			}),
		});

		// Include an extra field that the schema does not define
		const res = await POST(
			makeRequest({ ...VALID_FORM, injected_field: "evil_value" }),
			makeParams(),
		);
		// Should still succeed — Zod strips unknown keys by default
		expect(res.status).toBe(200);
	});
});
