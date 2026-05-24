// _______________
// Tests for src/lib/landingPage/landingExampleData.ts
//
// Covers:
//   - All six example monsters are present with required fields
//   - Helper functions return correct subsets
//   - getExampleMonsterById returns the right monster or undefined
//   - exampleMonsterIds matches the full list
//   - Static data satisfies the LandingExampleMonster type (compile-time)
// _______________

import { describe, expect, it } from "vitest";
import {
	exampleMonsters,
	exampleGalleryMonsters,
	exampleMonsterIds,
	featuredExampleMonster,
	getExampleMonsterById,
	sampleDownloadMonsters,
	type LandingExampleMonster,
} from "@/lib/landingPage/landingExampleData";

// ---------------------------------------------------------------------------
// Type-level compile check (no runtime effect)
// ---------------------------------------------------------------------------

// Ensure the static array is assignable to the derived type at compile time.
// If Monster type changes and the data drifts, this import would fail tsc.
const _typeCheck: readonly LandingExampleMonster[] = exampleMonsters;
void _typeCheck;

// ---------------------------------------------------------------------------
// Array completeness
// ---------------------------------------------------------------------------

describe("exampleMonsters array", () => {
	it("contains exactly six monsters", () => {
		expect(exampleMonsters).toHaveLength(6);
	});

	it("contains Magleta, Pyrix, QuaWalix, Ursola, Pemdrath, Ventanilla", () => {
		const names = exampleMonsters.map((m) => m.display_name);
		expect(names).toContain("Magleta");
		expect(names).toContain("Pyrix");
		expect(names).toContain("QuaWalix");
		expect(names).toContain("Ursola");
		expect(names).toContain("Pemdrath");
		expect(names).toContain("Ventanilla");
	});

	it("every monster has a non-empty id", () => {
		for (const monster of exampleMonsters) {
			expect(monster.id).toBeTruthy();
		}
	});

	it("every monster id is unique", () => {
		const ids = exampleMonsters.map((m) => m.id);
		expect(new Set(ids).size).toBe(exampleMonsters.length);
	});

	it("every monster has a non-empty display_name", () => {
		for (const monster of exampleMonsters) {
			expect(monster.display_name.trim()).not.toBe("");
		}
	});

	it("every monster has all four trait fields", () => {
		for (const monster of exampleMonsters) {
			expect(monster.traits.element).toBeTruthy();
			expect(monster.traits.habitat).toBeTruthy();
			expect(monster.traits.personality).toBeTruthy();
			expect(monster.traits.color_palette).toBeTruthy();
		}
	});

	it("every monster has a non-null image with a real public_image_url", () => {
		for (const monster of exampleMonsters) {
			expect(monster.image).not.toBeNull();
			expect(monster.image.public_image_url).toBeTruthy();
			expect(monster.image.public_image_url).toMatch(
				/^https:\/\/jspbqekckumhdgqgthxc\.supabase\.co\//,
			);
		}
	});

	it("every monster image URL ends with .png", () => {
		for (const monster of exampleMonsters) {
			expect(monster.image.public_image_url).toMatch(/\.png$/);
		}
	});

	it("every monster has an image_storage_path", () => {
		for (const monster of exampleMonsters) {
			expect(monster.image.image_storage_path.trim()).not.toBe("");
		}
	});

	it("every monster has a tagline", () => {
		for (const monster of exampleMonsters) {
			expect(monster.tagline.trim()).not.toBe("");
		}
	});

	it("every monster has an alt_text", () => {
		for (const monster of exampleMonsters) {
			expect(monster.alt_text.trim()).not.toBe("");
		}
	});

	it("every monster has a download_filename ending with .png", () => {
		for (const monster of exampleMonsters) {
			expect(monster.download_filename).toMatch(/\.png$/);
		}
	});

	it("every monster has a flavor_text", () => {
		for (const monster of exampleMonsters) {
			expect(monster.flavor_text?.trim()).toBeTruthy();
		}
	});

	it("download filenames are unique", () => {
		const names = exampleMonsters.map((m) => m.download_filename);
		expect(new Set(names).size).toBe(exampleMonsters.length);
	});
});

// ---------------------------------------------------------------------------
// getExampleMonsterById
// ---------------------------------------------------------------------------

describe("getExampleMonsterById", () => {
	it("returns Magleta for her id", () => {
		const monster = getExampleMonsterById(
			"49e01917-6db8-5c2c-9f2e-a52f80f246d5",
		);
		expect(monster).toBeDefined();
		expect(monster?.display_name).toBe("Magleta");
	});

	it("returns Ventanilla for her id", () => {
		const monster = getExampleMonsterById(
			"433ad09c-203f-53dc-8a0e-1f21143e4e7e",
		);
		expect(monster).toBeDefined();
		expect(monster?.display_name).toBe("Ventanilla");
	});

	it("returns undefined for an unknown id", () => {
		const monster = getExampleMonsterById(
			"00000000-0000-0000-0000-000000000000",
		);
		expect(monster).toBeUndefined();
	});

	it("returns undefined for an empty string", () => {
		const monster = getExampleMonsterById("");
		expect(monster).toBeUndefined();
	});

	it("is case-sensitive — uppercase ID returns undefined", () => {
		const monster = getExampleMonsterById(
			"49E01917-6DB8-5C2C-9F2E-A52F80F246D5",
		);
		expect(monster).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Helper constants
// ---------------------------------------------------------------------------

describe("featuredExampleMonster", () => {
	it("is the first monster in the array (Magleta)", () => {
		expect(featuredExampleMonster).toBe(exampleMonsters[0]);
		expect(featuredExampleMonster.display_name).toBe("Magleta");
	});
});

describe("sampleDownloadMonsters", () => {
	it("contains exactly three monsters", () => {
		expect(sampleDownloadMonsters).toHaveLength(3);
	});

	it("contains the first three monsters from the full list", () => {
		expect(sampleDownloadMonsters[0]).toBe(exampleMonsters[0]);
		expect(sampleDownloadMonsters[1]).toBe(exampleMonsters[1]);
		expect(sampleDownloadMonsters[2]).toBe(exampleMonsters[2]);
	});
});

describe("exampleGalleryMonsters", () => {
	it("contains all six monsters", () => {
		expect(exampleGalleryMonsters).toHaveLength(6);
	});

	it("contains the same items as exampleMonsters", () => {
		for (let i = 0; i < exampleMonsters.length; i++) {
			expect(exampleGalleryMonsters[i]).toBe(exampleMonsters[i]);
		}
	});
});

describe("exampleMonsterIds", () => {
	it("contains exactly six IDs", () => {
		expect(exampleMonsterIds).toHaveLength(6);
	});

	it("IDs match the monster IDs from the full list", () => {
		expect(exampleMonsterIds).toEqual(exampleMonsters.map((m) => m.id));
	});

	it("contains Magleta's id", () => {
		expect(exampleMonsterIds).toContain("49e01917-6db8-5c2c-9f2e-a52f80f246d5");
	});

	it("contains Ventanilla's id", () => {
		expect(exampleMonsterIds).toContain("433ad09c-203f-53dc-8a0e-1f21143e4e7e");
	});
});
