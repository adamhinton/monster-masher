// ______________
// Helpers for supabase storage of generated monster images.
// Image paths are determinative for both the fake and real storage implementations.
// Note that images are publicly available.
// ______________

import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env/env";
import type { UserProfile } from "@/lib/api/schemas/UserProfileSchema";
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import type { MonsterImage } from "@/lib/api/schemas/monster/MonsterImageSchema";

// ---------------------------------------------------------------------------
// MIME type + extension helpers (B4e)
// ---------------------------------------------------------------------------

/**
 * Exhaustive list of image MIME types this storage layer accepts.
 *
 * The provider (OpenAI or fake) is responsible for setting `mimeType` on its
 * result. We validate here — not at the provider — because the provider
 * abstraction should be unaware of storage constraints.
 */
export const SUPPORTED_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/** File extensions that correspond to `SUPPORTED_MIME_TYPES`, 1-to-1. */
export type SupportedExtension = "png" | "jpeg" | "webp";

/**
 * Maps every supported MIME type to its canonical file extension.
 * Used by `getExtensionForMimeType()` and the storage path builder.
 */
const MIME_TO_EXTENSION: Record<SupportedMimeType, SupportedExtension> = {
	"image/png": "png",
	"image/jpeg": "jpeg",
	"image/webp": "webp",
};

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
	return (SUPPORTED_MIME_TYPES as ReadonlyArray<string>).includes(mimeType);
}

/**
 * Maps a MIME type to its file extension.
 *
 * Returns `null` for unsupported types — callers MUST return a `failed` result
 * rather than throwing. Never trust the image provider to supply a valid extension;
 * always derive it from the MIME type here.
 *
 * @param mimeType Raw MIME type string from the image provider result.
 */
export function getExtensionForMimeType(
	mimeType: string,
): SupportedExtension | null {
	if (!isSupportedMimeType(mimeType)) return null;
	return MIME_TO_EXTENSION[mimeType];
}

// ---------------------------------------------------------------------------
// Storage path
// ---------------------------------------------------------------------------

/**
 * Template literal type for a monster image storage path.
 *
 * This is determinative; you'll always know the exact shape of the image's path based on the user, monster, extension and image IDs.
 *
 * Shape: `monster-images/{userProfileId}/{monsterId}/{monsterImageId}.{ext}`
 *
 * Using `UserProfile["id"]`, `Monster["id"]`, and `MonsterImage["id"]` as the
 * slot types (rather than plain `string`) means this type stays coupled to the
 * actual model ID types. If IDs are ever narrowed to branded types the compiler
 * will catch mismatches at every call site.
 *
 * The three-level nesting is intentional:
 *   - `user_profile_id` at the root enables per-user bucket policies.
 *   - `monster_id`       allows all images for one monster to be listed/deleted
 *                        together if regeneration is ever supported.
 *   - `monster_image_id` guarantees uniqueness per generation attempt.
 */
export type MonsterImageStoragePath =
	`monster-images/${UserProfile["id"]}/${Monster["id"]}/${MonsterImage["id"]}.${SupportedExtension}`;

/**
 * Constructs the Supabase Storage path for a monster image.
 *
 * Pure function — no side effects, no I/O. Safe to call in tests without any
 * mocking.
 *
 * @param userProfileId The Django UserProfile UUID. MUST come from the verified
 *   JWT identity — never from client request body.
 * @param monsterId     The Django Monster UUID.
 * @param monsterImageId The Django MonsterImage UUID.
 * @param ext           File extension derived via `getExtensionForMimeType()`.
 */
export function buildStoragePath(
	userProfileId: UserProfile["id"],
	monsterId: Monster["id"],
	monsterImageId: MonsterImage["id"],
	ext: SupportedExtension,
): MonsterImageStoragePath {
	return `monster-images/${userProfileId}/${monsterId}/${monsterImageId}.${ext}`;
}

// ---------------------------------------------------------------------------
// Core types (B4a)
// ---------------------------------------------------------------------------

/**
 * Discriminated union for upload outcomes.
 *
 * `success` — Upload complete. `public_image_url` and `image_storage_path` are
 *   ready to be persisted to the `MonsterImage` row in Django.
 *
 * `failed`  — Upload failed. `safeErrorMessage` is safe to surface in UI and
 *   must never contain Supabase internals, bucket names, or key material.
 */
export type ImageStorageResult =
	| {
			outcome: "success";
			public_image_url: string;
			image_storage_path: MonsterImageStoragePath;
	  }
	| { outcome: "failed"; safeErrorMessage: string };

/**
 * Parameters required to upload a monster image to storage.
 *
 * ID fields use the exact types from the Zod-inferred model types so the
 * compiler catches wrong-ID mistakes (e.g. passing `monster_id` where
 * `monster_image_id` is expected) at the call site.
 *
 * IMPORTANT: `user_profile_id` MUST come from the verified JWT identity.
 * The route handler is responsible for enforcing this — never accept it from
 * the client request body.
 */
export interface UploadOptions {
	user_profile_id: UserProfile["id"];
	monster_id: Monster["id"];
	monster_image_id: MonsterImage["id"];
	/** Raw MIME type from the image provider result (e.g. "image/png"). */
	mimeType: string;
}

/**
 * Contract every image storage implementation must satisfy.
 *
 * Route handlers depend ONLY on this interface, never on a concrete class.
 * Implementations:
 *   - `FakeImageStorage`     → tests and IMAGE_GENERATION_MODE=fake
 *   - `SupabaseImageStorage` → production with IMAGE_GENERATION_MODE=real
 *
 * Always obtain instances via `getImageStorage()` rather than importing
 * concrete classes directly in route handlers.
 */
export interface ImageStorage {
	/**
	 * Validate the MIME type, build the storage path, and upload the image bytes.
	 *
	 * Returns a `failed` result (never throws) for: invalid MIME type, upload
	 * error, or URL retrieval failure.
	 */
	upload(
		imageBytes: Buffer,
		options: UploadOptions,
	): Promise<ImageStorageResult>;
}

// ---------------------------------------------------------------------------
// Fixture constant (used by FakeImageStorage and tests)
// ---------------------------------------------------------------------------

/**
 * Stable public URL returned by the fake storage layer.
 *
 * Points to a real placeholder image so downstream code that uses the URL
 * (e.g. rendering it in a Next.js Image component) works without a real bucket.
 */
export const FAKE_PUBLIC_IMAGE_URL =
	"https://placehold.co/512x512/png" as const;

// ---------------------------------------------------------------------------
// FakeImageStorage
// ---------------------------------------------------------------------------

/**
 * Fake storage for IMAGE_GENERATION_MODE=fake and unit tests.
 *
 * Returns stable, deterministic values so tests can assert on exact output:
 *   - `public_image_url` is always `FAKE_PUBLIC_IMAGE_URL`.
 *   - `image_storage_path` is the real path built from the provided IDs,
 *     so tests can verify the path construction logic end-to-end.
 *
 * MIME validation is still performed, because the fake layer should enforce
 * the same contract as the real layer — catching invalid MIME types in tests
 * rather than only in production.
 *
 * Constraints:
 *   - NEVER imports or calls the Supabase SDK.
 *   - NEVER makes any network calls.
 */
export class FakeImageStorage implements ImageStorage {
	/**
	 * @param shouldFail When `true`, every call returns `{ outcome: 'failed' }`.
	 *   Use this in tests to exercise the storage-failure branch of the route handler.
	 */
	constructor(private readonly shouldFail = false) {}

	async upload(
		_imageBytes: Buffer,
		options: UploadOptions,
	): Promise<ImageStorageResult> {
		if (this.shouldFail) {
			return {
				outcome: "failed",
				safeErrorMessage: "Fake storage: forced failure for testing.",
			};
		}

		const ext = getExtensionForMimeType(options.mimeType);
		if (ext === null) {
			return {
				outcome: "failed",
				safeErrorMessage: `Unsupported MIME type: ${options.mimeType}. Expected one of: ${SUPPORTED_MIME_TYPES.join(", ")}.`,
			};
		}

		const imagePath = buildStoragePath(
			options.user_profile_id,
			options.monster_id,
			options.monster_image_id,
			ext,
		);

		return {
			outcome: "success",
			public_image_url: FAKE_PUBLIC_IMAGE_URL,
			image_storage_path: imagePath,
		};
	}
}

// ---------------------------------------------------------------------------
// SupabaseImageStorage
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase client authenticated with the service role key.
 *
 * The service role key bypasses Row Level Security and grants full bucket
 * access. This client is appropriate for server-side storage writes where
 * the route handler has already verified the user's identity from the JWT.
 *
 * NEVER expose the service role key or this client to browser code. But we imported `server-only` so that should be impossible.
 */
function createSupabaseServiceRoleClient() {
	return createClient(env.supabaseUrl, env.supabaseSecretKey, {
		auth: {
			// Service role clients manage no session — disable token refresh.
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}

/**
 * Production Supabase Storage implementation.
 *
 * Uploads image bytes to `SUPABASE_STORAGE_BUCKET` and returns the public URL.
 *
 * Authentication: service role key (server-only, bypasses RLS).
 * The route handler MUST verify the user's JWT and validate all IDs before
 * calling `upload()` — this class trusts its inputs.
 *
 * Error handling:
 *   - MIME type validation runs before any SDK call (B4e).
 *   - Supabase SDK errors are caught and returned as `{ outcome: 'failed' }`.
 *   - Raw SDK error messages are never included in `safeErrorMessage`.
 */
export class SupabaseImageStorage implements ImageStorage {
	async upload(
		imageBytes: Buffer,
		options: UploadOptions,
	): Promise<ImageStorageResult> {
		// Validate MIME type before touching storage. Derive the extension
		// from it rather than trusting the provider to set a correct one.
		const ext = getExtensionForMimeType(options.mimeType);
		if (ext === null) {
			return {
				outcome: "failed",
				safeErrorMessage: `Unsupported MIME type: ${options.mimeType}. Expected one of: ${SUPPORTED_MIME_TYPES.join(", ")}.`,
			};
		}

		const storagePath = buildStoragePath(
			options.user_profile_id,
			options.monster_id,
			options.monster_image_id,
			ext,
		);

		const supabase = createSupabaseServiceRoleClient();
		const bucket = env.supabaseStorageBucket;

		try {
			const { error: uploadError } = await supabase.storage
				.from(bucket)
				.upload(storagePath, imageBytes, { contentType: options.mimeType });

			if (uploadError) {
				// Log internally (Sentry will capture this), return safe message to caller.
				console.error(
					"[SupabaseImageStorage] Upload error:",
					uploadError.message,
				);
				return {
					outcome: "failed",
					safeErrorMessage: "Image upload failed. Please try again.",
				};
			}
		} catch (unexpectedError) {
			console.error(
				"[SupabaseImageStorage] Unexpected upload error:",
				unexpectedError,
			);
			return {
				outcome: "failed",
				safeErrorMessage: "Image upload failed unexpectedly. Please try again.",
			};
		}

		// `getPublicUrl` does not make a network call and does not return an error.
		const { data: urlData } = supabase.storage
			.from(bucket)
			.getPublicUrl(storagePath);

		return {
			outcome: "success",
			public_image_url: urlData.publicUrl,
			image_storage_path: storagePath,
		};
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the correct ImageStorage implementation for IMAGE_GENERATION_MODE.
 *
 *   IMAGE_GENERATION_MODE=fake → FakeImageStorage (no Supabase SDK calls)
 *   IMAGE_GENERATION_MODE=real → SupabaseImageStorage (live Supabase upload)
 *
 * Route handlers MUST call this factory rather than importing storage classes
 * directly. In tests, instantiate FakeImageStorage directly instead.
 */
export function getImageStorage(): ImageStorage {
	if (env.imageGenerationMode === "fake") {
		return new FakeImageStorage();
	}

	return new SupabaseImageStorage();
}
