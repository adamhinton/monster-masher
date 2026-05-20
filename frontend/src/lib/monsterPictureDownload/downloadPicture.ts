// ______________
// Download utility for monster profile pictures.
// Sanitizes the monster display name into a safe filename, then fetches
// the public image URL as a blob and triggers a browser download.
//
// Self-contained: no server calls beyond the image URL itself.
// All exports are pure functions (except downloadMonsterImage, which touches the DOM).
// ______________

import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import { Url } from "url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DownloadResult =
	| { outcome: "success" }
	| { outcome: "failed"; safeErrorMessage: string };

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/**
 * Sanitizes a monster's display name into a safe, kebab-case filename stem.
 *
 * Rules:
 * - Lowercased
 * - Spaces and underscores → hyphens
 * - Any character that is not alphanumeric or hyphen is stripped
 * - Consecutive hyphens collapsed to one
 * - Leading/trailing hyphens trimmed
 * - Falls back to "monster" if the result is empty after sanitization
 */
export function sanitizeFilename(displayName: Monster["display_name"]): string {
	const sanitized = displayName
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
	return sanitized.length > 0 ? sanitized : "monster";
}

/**
 * Returns the file extension from a Supabase storage path string.
 *
 * Accepts paths shaped like `monster-images/{uid}/{mid}/{imageId}.png`.
 * Only returns known safe extensions ("png", "jpeg", "webp").
 * Falls back to "png" for missing, malformed, or unknown extensions.
 */
export function getExtensionFromStoragePath(storagePath: string): string {
	const lastDot = storagePath.lastIndexOf(".");
	if (lastDot === -1 || lastDot === storagePath.length - 1) return "png";
	const ext = storagePath.slice(lastDot + 1);
	if (ext === "jpeg" || ext === "png" || ext === "webp") return ext;
	return "png";
}

/**
 * Derives the suggested download filename (stem + extension) for a monster image.
 *
 * The stem comes from the monster's `display_name` (sanitized); the extension
 * is extracted from `image.image_storage_path` so we match the original format.
 *
 * @param monster Monster that must have a non-null `image` field.
 */
export function getMonsterImageFilename(
	monster: Monster & { image: NonNullable<Monster["image"]> },
): string {
	const stem = sanitizeFilename(monster.display_name);
	const ext = getExtensionFromStoragePath(monster.image.image_storage_path);
	return `${stem}.${ext}`;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Fetches the image at `imageUrl` as a blob and triggers a browser download
 * with `filename` as the suggested save name.
 *
 * Approach: fetch → blob → createObjectURL → programmatic anchor click →
 * revokeObjectURL. Works cross-origin for publicly accessible Supabase Storage URLs.
 *
 * Returns a `DownloadResult` — never throws.
 *
 * @param imageUrl  The public URL of the monster image (from `MonsterImage.public_image_url`).
 * @param filename  The suggested filename for the saved file (e.g. "mucksnout.png").
 */
export async function downloadMonsterImage(
	imageUrl: string,
	filename: ReturnType<typeof getMonsterImageFilename>,
): Promise<DownloadResult> {
	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			return {
				outcome: "failed",
				safeErrorMessage: "Failed to fetch the image. Please try again.",
			};
		}
		const blob = await response.blob();
		const objectUrl = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = objectUrl;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(objectUrl);
		return { outcome: "success" };
	} catch {
		return {
			outcome: "failed",
			safeErrorMessage:
				"Something went wrong while downloading. Please try again.",
		};
	}
}
