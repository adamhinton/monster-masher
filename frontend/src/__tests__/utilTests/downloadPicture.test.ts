// ________
// Unit tests for downloadPicture utility.
// All DOM and fetch interactions are mocked — no network calls, no real browser APIs.
// ________

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	sanitizeFilename,
	getExtensionFromStoragePath,
	getMonsterImageFilename,
	downloadMonsterImage,
} from "@/lib/monsterPictureDownload/downloadPicture";
import { validMonsterWithImage } from "@/__tests__/__testUtils__/fixtures";

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe("sanitizeFilename", () => {
	it("lowercases the input", () => {
		expect(sanitizeFilename("Mucksnout")).toBe("mucksnout");
	});

	it("replaces spaces with hyphens", () => {
		expect(sanitizeFilename("Blood Fire Goblin")).toBe("blood-fire-goblin");
	});

	it("replaces underscores with hyphens", () => {
		expect(sanitizeFilename("fire_goblin")).toBe("fire-goblin");
	});

	it("strips characters that are not alphanumeric or hyphens", () => {
		expect(sanitizeFilename("Bog!fire@#Goblin")).toBe("bogfiregoblin");
	});

	it("collapses consecutive hyphens", () => {
		expect(sanitizeFilename("fire  goblin")).toBe("fire-goblin");
	});

	it("trims leading hyphens", () => {
		expect(sanitizeFilename("  leading")).toBe("leading");
	});

	it("trims trailing hyphens", () => {
		expect(sanitizeFilename("trailing  ")).toBe("trailing");
	});

	it("falls back to 'monster' when result is empty", () => {
		expect(sanitizeFilename("!!!")).toBe("monster");
	});

	it("falls back to 'monster' for an empty string", () => {
		expect(sanitizeFilename("")).toBe("monster");
	});

	it("handles a typical monster name end-to-end", () => {
		expect(sanitizeFilename("Gloomspark")).toBe("gloomspark");
	});
});

// ---------------------------------------------------------------------------
// getExtensionFromStoragePath
// ---------------------------------------------------------------------------

describe("getExtensionFromStoragePath", () => {
	it("extracts 'png' from a storage path", () => {
		expect(
			getExtensionFromStoragePath(
				"monster-images/user-id/monster-id/image-id.png",
			),
		).toBe("png");
	});

	it("extracts 'jpeg' from a storage path", () => {
		expect(
			getExtensionFromStoragePath(
				"monster-images/user-id/monster-id/image-id.jpeg",
			),
		).toBe("jpeg");
	});

	it("extracts 'webp' from a storage path", () => {
		expect(
			getExtensionFromStoragePath(
				"monster-images/user-id/monster-id/image-id.webp",
			),
		).toBe("webp");
	});

	it("falls back to 'png' for an unknown extension", () => {
		expect(
			getExtensionFromStoragePath(
				"monster-images/user-id/monster-id/image-id.bmp",
			),
		).toBe("png");
	});

	it("falls back to 'png' when there is no extension", () => {
		expect(getExtensionFromStoragePath("monster-images/no-extension")).toBe(
			"png",
		);
	});

	it("falls back to 'png' for a path ending in a dot", () => {
		expect(getExtensionFromStoragePath("monster-images/image.")).toBe("png");
	});
});

// ---------------------------------------------------------------------------
// getMonsterImageFilename
// ---------------------------------------------------------------------------

describe("getMonsterImageFilename", () => {
	it("combines the sanitized display name and extension", () => {
		// validMonsterWithImage has display_name "Gloomspark" and storage path "monsters/test.png"
		const filename = getMonsterImageFilename(
			validMonsterWithImage as typeof validMonsterWithImage & {
				image: NonNullable<(typeof validMonsterWithImage)["image"]>;
			},
		);
		expect(filename).toBe("gloomspark.png");
	});

	it("uses the extension from image_storage_path, not the display name", () => {
		const monster = {
			...validMonsterWithImage,
			display_name: "Ember Beast",
			image: {
				...validMonsterWithImage.image!,
				image_storage_path: "monster-images/u/m/i.webp",
			},
		};
		expect(
			getMonsterImageFilename(
				monster as typeof monster & {
					image: NonNullable<(typeof monster)["image"]>;
				},
			),
		).toBe("ember-beast.webp");
	});
});

// ---------------------------------------------------------------------------
// downloadMonsterImage
// ---------------------------------------------------------------------------

describe("downloadMonsterImage", () => {
	const imageUrl = "https://example.com/test.png";
	const filename = "mucksnout.png";

	let mockFetch: ReturnType<typeof vi.fn>;
	let mockCreateObjectURL: ReturnType<typeof vi.fn>;
	let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
	let mockAnchorClick: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockAnchorClick = vi.fn();

		// Stub document.createElement to intercept anchor creation
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				if (tagName === "a") {
					return {
						href: "",
						download: "",
						click: mockAnchorClick,
					} as unknown as HTMLAnchorElement;
				}
				// For any other tag, fall through to the real implementation
				return document.createElement.call(document, tagName);
			},
		);

		// Stub document.body methods for anchor attachment
		vi.spyOn(document.body, "appendChild").mockImplementation(
			(node) => node as Node,
		);
		vi.spyOn(document.body, "removeChild").mockImplementation(
			(node) => node as Node,
		);

		mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
		mockRevokeObjectURL = vi.fn();
		vi.stubGlobal("URL", {
			createObjectURL: mockCreateObjectURL,
			revokeObjectURL: mockRevokeObjectURL,
		});

		mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: vi.fn().mockResolvedValue(new Blob(["img"], { type: "image/png" })),
		});
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("returns { outcome: 'success' } on a successful download", async () => {
		const result = await downloadMonsterImage(imageUrl, filename);
		expect(result.outcome).toBe("success");
	});

	it("fetches the image URL", async () => {
		await downloadMonsterImage(imageUrl, filename);
		expect(mockFetch).toHaveBeenCalledWith(imageUrl);
	});

	it("creates a blob URL and triggers anchor click", async () => {
		await downloadMonsterImage(imageUrl, filename);
		expect(mockCreateObjectURL).toHaveBeenCalledOnce();
		expect(mockAnchorClick).toHaveBeenCalledOnce();
	});

	it("sets the anchor download attribute to the provided filename", async () => {
		// We need to capture the anchor to inspect its properties
		const capturedAnchors: Array<{
			href: string;
			download: string;
			click: () => void;
		}> = [];
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				if (tagName === "a") {
					const anchor = {
						href: "",
						download: "",
						click: mockAnchorClick as unknown as () => void,
					};
					capturedAnchors.push(anchor);
					return anchor as unknown as HTMLAnchorElement;
				}
				return document.createElement.call(document, tagName);
			},
		);

		await downloadMonsterImage(imageUrl, filename);
		expect(capturedAnchors[0]?.download).toBe(filename);
	});

	it("revokes the object URL after clicking", async () => {
		await downloadMonsterImage(imageUrl, filename);
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
	});

	it("returns { outcome: 'failed' } when fetch responds with a non-ok status", async () => {
		mockFetch.mockResolvedValue({ ok: false });
		const result = await downloadMonsterImage(imageUrl, filename);
		expect(result.outcome).toBe("failed");
		if (result.outcome === "failed") {
			expect(result.safeErrorMessage).toBeTruthy();
		}
	});

	it("returns { outcome: 'failed' } when fetch throws", async () => {
		mockFetch.mockRejectedValue(new Error("Network error"));
		const result = await downloadMonsterImage(imageUrl, filename);
		expect(result.outcome).toBe("failed");
		if (result.outcome === "failed") {
			expect(result.safeErrorMessage).toBeTruthy();
		}
	});

	it("does not call click when fetch fails", async () => {
		mockFetch.mockResolvedValue({ ok: false });
		await downloadMonsterImage(imageUrl, filename);
		expect(mockAnchorClick).not.toHaveBeenCalled();
	});
});
