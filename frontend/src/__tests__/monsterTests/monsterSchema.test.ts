// _____________
// Unit tests for the Monster Zod schema
// Ensuring that it and its subtypes only allow valid state, that they dodge common footguns, etc
// _____________

import { describe, it, expect } from "vitest";
import { MonsterSchema } from "@/lib/api/schemas/monster/MonsterSchema";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validMonster = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	display_name: "Mucksnout",
	traits: {
		element: "Bogfire",
		habitat: "Mushroom swamp",
		personality: "grumpy",
		color_palette: "mud green and ember orange",
	},
	flavor_text: "A cranky little swamp goblin.",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-01T00:00:00.000Z",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MonsterSchema", () => {
	describe("valid inputs", () => {
		it("parses a complete valid monster", () => {
			expect(MonsterSchema.safeParse(validMonster).success).toBe(true);
		});

		it("parses a monster without flavor_text — it is optional", () => {
			const { flavor_text: _flavor_text, ...withoutFlavorText } = validMonster;
			expect(MonsterSchema.safeParse(withoutFlavorText).success).toBe(true);
		});

		it("parses with an empty string flavor_text", () => {
			expect(
				MonsterSchema.safeParse({ ...validMonster, flavor_text: "" }).success,
			).toBe(true);
		});

		it("parses with an empty string display_name — no min-length is enforced at this layer", () => {
			expect(
				MonsterSchema.safeParse({ ...validMonster, display_name: "" }).success,
			).toBe(true);
		});
	});

	describe("rejects missing required fields", () => {
		it("rejects when id is missing", () => {
			const { id: _id, ...withoutId } = validMonster;
			expect(MonsterSchema.safeParse(withoutId).success).toBe(false);
		});

		it("rejects when display_name is missing", () => {
			const { display_name: _display_name, ...withoutName } = validMonster;
			expect(MonsterSchema.safeParse(withoutName).success).toBe(false);
		});

		it("rejects when traits is missing entirely", () => {
			const { traits: _traits, ...withoutTraits } = validMonster;
			expect(MonsterSchema.safeParse(withoutTraits).success).toBe(false);
		});

		it("rejects when created_at is missing", () => {
			const { created_at: _created_at, ...withoutCreatedAt } = validMonster;
			expect(MonsterSchema.safeParse(withoutCreatedAt).success).toBe(false);
		});

		it("rejects when updated_at is missing", () => {
			const { updated_at: _updated_at, ...withoutUpdatedAt } = validMonster;
			expect(MonsterSchema.safeParse(withoutUpdatedAt).success).toBe(false);
		});
	});

	describe("rejects invalid id", () => {
		it("rejects a non-UUID id", () => {
			expect(
				MonsterSchema.safeParse({ ...validMonster, id: "not-a-uuid" }).success,
			).toBe(false);
		});

		it("rejects an empty string id", () => {
			expect(MonsterSchema.safeParse({ ...validMonster, id: "" }).success).toBe(
				false,
			);
		});

		it("rejects a numeric id", () => {
			expect(
				MonsterSchema.safeParse({ ...validMonster, id: 12345 }).success,
			).toBe(false);
		});
	});

	describe("rejects invalid traits", () => {
		it("rejects when traits.element is missing", () => {
			const { element: _element, ...traitsWithoutElement } =
				validMonster.traits;
			expect(
				MonsterSchema.safeParse({
					...validMonster,
					traits: traitsWithoutElement,
				}).success,
			).toBe(false);
		});

		it("rejects when traits.habitat is missing", () => {
			const { habitat: _habitat, ...traitsWithoutHabitat } =
				validMonster.traits;
			expect(
				MonsterSchema.safeParse({
					...validMonster,
					traits: traitsWithoutHabitat,
				}).success,
			).toBe(false);
		});

		it("rejects when traits.personality is missing", () => {
			const { personality: _personality, ...traitsWithoutPersonality } =
				validMonster.traits;
			expect(
				MonsterSchema.safeParse({
					...validMonster,
					traits: traitsWithoutPersonality,
				}).success,
			).toBe(false);
		});

		it("rejects when traits.color_palette is missing", () => {
			const { color_palette: _color_palette, ...traitsWithoutColorPalette } =
				validMonster.traits;
			expect(
				MonsterSchema.safeParse({
					...validMonster,
					traits: traitsWithoutColorPalette,
				}).success,
			).toBe(false);
		});

		it("rejects when traits is a flat string instead of an object", () => {
			expect(
				MonsterSchema.safeParse({ ...validMonster, traits: "Bogfire" }).success,
			).toBe(false);
		});
	});

	describe("footguns", () => {
		it("rejects null flavor_text — nullable is not the same as optional; use undefined or omit the field", () => {
			expect(
				MonsterSchema.safeParse({ ...validMonster, flavor_text: null }).success,
			).toBe(false);
		});

		it("strips unknown top-level fields silently", () => {
			const result = MonsterSchema.safeParse({
				...validMonster,
				unknown_backend_field: "surprise",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(Object.keys(result.data)).not.toContain("unknown_backend_field");
			}
		});

		it("strips unknown fields within traits silently", () => {
			const result = MonsterSchema.safeParse({
				...validMonster,
				traits: { ...validMonster.traits, rarity: "legendary" },
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(Object.keys(result.data.traits)).not.toContain("rarity");
			}
		});

		it("rejects null input", () => {
			expect(MonsterSchema.safeParse(null).success).toBe(false);
		});

		it("rejects non-object input", () => {
			expect(MonsterSchema.safeParse("a string").success).toBe(false);
			expect(MonsterSchema.safeParse(42).success).toBe(false);
		});
	});
});
