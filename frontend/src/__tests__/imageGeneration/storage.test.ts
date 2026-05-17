import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	buildStoragePath,
	getExtensionForMimeType,
	FakeImageStorage,
	SupabaseImageStorage,
	FAKE_PUBLIC_IMAGE_URL,
	SUPPORTED_MIME_TYPES,
} from "@/lib/monsterGeneration/imageGeneration/storage/storage";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const USER_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const MONSTER_ID = "bbbbbbbb-0000-0000-0000-000000000002";
const IMAGE_ID = "cccccccc-0000-0000-0000-000000000003";

const validUploadOptions = {
	user_profile_id: USER_ID,
	monster_id: MONSTER_ID,
	monster_image_id: IMAGE_ID,
	mimeType: "image/png",
} as const;

const fakePngBytes = Buffer.from("fake-png-bytes");

// ---------------------------------------------------------------------------
// buildStoragePath
// ---------------------------------------------------------------------------

describe("buildStoragePath", () => {
	it("constructs the correct path shape", () => {
		const path = buildStoragePath(USER_ID, MONSTER_ID, IMAGE_ID, "png");
		expect(path).toBe(
			`monster-images/${USER_ID}/${MONSTER_ID}/${IMAGE_ID}.png`,
		);
	});

	it("uses the correct extension for each supported type", () => {
		expect(buildStoragePath(USER_ID, MONSTER_ID, IMAGE_ID, "png")).toMatch(
			/\.png$/,
		);
		expect(buildStoragePath(USER_ID, MONSTER_ID, IMAGE_ID, "jpeg")).toMatch(
			/\.jpeg$/,
		);
		expect(buildStoragePath(USER_ID, MONSTER_ID, IMAGE_ID, "webp")).toMatch(
			/\.webp$/,
		);
	});

	it("always starts with the bucket prefix", () => {
		const path = buildStoragePath(USER_ID, MONSTER_ID, IMAGE_ID, "png");
		expect(path).toMatch(/^monster-images\//);
	});

	it("nests user_id / monster_id / image_id in that order", () => {
		const path = buildStoragePath(USER_ID, MONSTER_ID, IMAGE_ID, "png");
		const parts = path.split("/");
		// ["monster-images", USER_ID, MONSTER_ID, "IMAGE_ID.png"]
		expect(parts[1]).toBe(USER_ID);
		expect(parts[2]).toBe(MONSTER_ID);
		expect(parts[3]).toBe(`${IMAGE_ID}.png`);
	});
});

// ---------------------------------------------------------------------------
// getExtensionForMimeType
// ---------------------------------------------------------------------------

describe("getExtensionForMimeType", () => {
	it("maps image/png to png", () => {
		expect(getExtensionForMimeType("image/png")).toBe("png");
	});

	it("maps image/jpeg to jpeg", () => {
		expect(getExtensionForMimeType("image/jpeg")).toBe("jpeg");
	});

	it("maps image/webp to webp", () => {
		expect(getExtensionForMimeType("image/webp")).toBe("webp");
	});

	it("returns null for an unsupported MIME type", () => {
		expect(getExtensionForMimeType("image/gif")).toBeNull();
		expect(getExtensionForMimeType("application/pdf")).toBeNull();
		expect(getExtensionForMimeType("")).toBeNull();
	});

	it("covers every entry in SUPPORTED_MIME_TYPES", () => {
		// Guards against SUPPORTED_MIME_TYPES being extended without updating the map
		for (const mimeType of SUPPORTED_MIME_TYPES) {
			expect(getExtensionForMimeType(mimeType)).not.toBeNull();
		}
	});
});

// ---------------------------------------------------------------------------
// FakeImageStorage — success path
// ---------------------------------------------------------------------------

describe("FakeImageStorage (default — shouldFail=false)", () => {
	it("returns success with the stable fixture URL", async () => {
		const storage = new FakeImageStorage();
		const result = await storage.upload(fakePngBytes, validUploadOptions);

		expect(result.outcome).toBe("success");
		if (result.outcome !== "success") return;
		expect(result.public_image_url).toBe(FAKE_PUBLIC_IMAGE_URL);
	});

	it("returns the correctly-constructed storage path", async () => {
		const storage = new FakeImageStorage();
		const result = await storage.upload(fakePngBytes, validUploadOptions);

		expect(result.outcome).toBe("success");
		if (result.outcome !== "success") return;
		expect(result.image_storage_path).toBe(
			`monster-images/${USER_ID}/${MONSTER_ID}/${IMAGE_ID}.png`,
		);
	});

	it("derives the extension from mimeType, not from the caller", async () => {
		const storage = new FakeImageStorage();
		const result = await storage.upload(fakePngBytes, {
			...validUploadOptions,
			mimeType: "image/webp",
		});

		expect(result.outcome).toBe("success");
		if (result.outcome !== "success") return;
		expect(result.image_storage_path).toMatch(/\.webp$/);
	});

	it("returns failed for an unsupported MIME type", async () => {
		const storage = new FakeImageStorage();
		const result = await storage.upload(fakePngBytes, {
			...validUploadOptions,
			mimeType: "image/gif",
		});

		expect(result.outcome).toBe("failed");
	});
});

// ---------------------------------------------------------------------------
// FakeImageStorage — shouldFail path
// ---------------------------------------------------------------------------

describe("FakeImageStorage (shouldFail=true)", () => {
	it("returns failed regardless of input", async () => {
		const storage = new FakeImageStorage(true);
		const result = await storage.upload(fakePngBytes, validUploadOptions);

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return;
		expect(typeof result.safeErrorMessage).toBe("string");
		expect(result.safeErrorMessage.length).toBeGreaterThan(0);
	});

	it("never includes success fields when failing", async () => {
		const storage = new FakeImageStorage(true);
		const result = await storage.upload(fakePngBytes, validUploadOptions);

		expect(result).not.toHaveProperty("public_image_url");
		expect(result).not.toHaveProperty("image_storage_path");
	});
});

// ---------------------------------------------------------------------------
// SupabaseImageStorage — shell / MIME validation (no real SDK calls)
// ---------------------------------------------------------------------------

describe("SupabaseImageStorage MIME validation (no real Supabase calls)", () => {
	it("returns failed for an unsupported MIME type before any SDK call", async () => {
		// This test verifies B4e: MIME validation happens before the SDK is invoked.
		// Because the MIME type is invalid, SupabaseImageStorage returns early and
		// never reaches the createClient() call — so no Supabase mock is needed.
		const storage = new SupabaseImageStorage();
		const result = await storage.upload(fakePngBytes, {
			...validUploadOptions,
			mimeType: "image/bmp",
		});

		expect(result.outcome).toBe("failed");
		if (result.outcome !== "failed") return;
		expect(result.safeErrorMessage).toContain("Unsupported MIME type");
	});
});

// ---------------------------------------------------------------------------
// getImageStorage factory
// ---------------------------------------------------------------------------

describe("getImageStorage factory", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		vi.resetModules();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns FakeImageStorage when IMAGE_GENERATION_MODE=fake", async () => {
		process.env.IMAGE_GENERATION_MODE = "fake";
		const { getImageStorage } =
			await import("@/lib/monsterGeneration/imageGeneration/storage/storage");
		const storage = getImageStorage();
		// Fake storage returns success — confirms we got FakeImageStorage
		const result = await storage.upload(fakePngBytes, validUploadOptions);
		expect(result.outcome).toBe("success");
	});

	it("returns SupabaseImageStorage when IMAGE_GENERATION_MODE=real", async () => {
		process.env.IMAGE_GENERATION_MODE = "real";
		// SupabaseImageStorage needs these env vars to not throw on module load
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
		process.env.SUPABASE_SECRET_KEY = "fake-service-role-key";
		const { getImageStorage } =
			await import("@/lib/monsterGeneration/imageGeneration/storage/storage");
		const storage = getImageStorage();
		// The MIME validation short-circuit means no real SDK call is made here
		const result = await storage.upload(fakePngBytes, {
			...validUploadOptions,
			mimeType: "image/gif", // invalid — returns failed before createClient()
		});
		expect(result.outcome).toBe("failed");
	});

	it("throws when IMAGE_GENERATION_MODE is absent", async () => {
		delete process.env.IMAGE_GENERATION_MODE;
		const { getImageStorage } =
			await import("@/lib/monsterGeneration/imageGeneration/storage/storage");
		expect(() => getImageStorage()).toThrow("Missing IMAGE_GENERATION_MODE");
	});
});
