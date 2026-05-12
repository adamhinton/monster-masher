// _____________
// Unit tests for the MonsterImage Zod schema
// Ensuring that it and its subtypes only allow valid state, that they dodge common footguns, etc
// _____________

import { describe, it, expect } from "vitest";
import { MonsterImageSchema } from "@/lib/api/schemas/monster/MonsterImageSchema";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validMonsterImage = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	public_image_url: "https://example.com/monster.png",
	image_storage_path: "monsters/user123/monster.png",
	provider: "fake",
	provider_model: "fake-fixture-v1",
	created_at: "2026-01-01T00:00:00.000Z",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MonsterImageSchema", () => {
	describe("valid inputs", () => {
		it("parses a complete valid image", () => {
			expect(MonsterImageSchema.safeParse(validMonsterImage).success).toBe(
				true,
			);
		});

		it("parses with null public_image_url — the image may not have finished uploading yet", () => {
			expect(
				MonsterImageSchema.safeParse({
					...validMonsterImage,
					public_image_url: null,
				}).success,
			).toBe(true);
		});

		it("parses with an empty string image_storage_path — path is not always known at creation", () => {
			expect(
				MonsterImageSchema.safeParse({
					...validMonsterImage,
					image_storage_path: "",
				}).success,
			).toBe(true);
		});
	});

	describe("rejects missing required fields", () => {
		it("rejects when id is missing", () => {
			const { id: _id, ...withoutId } = validMonsterImage;
			expect(MonsterImageSchema.safeParse(withoutId).success).toBe(false);
		});

		it("rejects when public_image_url is missing — it is nullable not optional; the field must be present", () => {
			const { public_image_url: _url, ...withoutUrl } = validMonsterImage;
			expect(MonsterImageSchema.safeParse(withoutUrl).success).toBe(false);
		});

		it("rejects when image_storage_path is missing", () => {
			const { image_storage_path: _path, ...withoutPath } = validMonsterImage;
			expect(MonsterImageSchema.safeParse(withoutPath).success).toBe(false);
		});

		it("rejects when provider is missing", () => {
			const { provider: _provider, ...withoutProvider } = validMonsterImage;
			expect(MonsterImageSchema.safeParse(withoutProvider).success).toBe(false);
		});

		it("rejects when provider_model is missing", () => {
			const { provider_model: _model, ...withoutProviderModel } =
				validMonsterImage;
			expect(MonsterImageSchema.safeParse(withoutProviderModel).success).toBe(
				false,
			);
		});

		it("rejects when created_at is missing", () => {
			const { created_at: _created_at, ...withoutCreatedAt } =
				validMonsterImage;
			expect(MonsterImageSchema.safeParse(withoutCreatedAt).success).toBe(
				false,
			);
		});
	});

	describe("rejects invalid id", () => {
		it("rejects a non-UUID id", () => {
			expect(
				MonsterImageSchema.safeParse({
					...validMonsterImage,
					id: "not-a-uuid",
				}).success,
			).toBe(false);
		});

		it("rejects null id — id is UUID, not nullable", () => {
			expect(
				MonsterImageSchema.safeParse({ ...validMonsterImage, id: null })
					.success,
			).toBe(false);
		});
	});

	describe("rejects invalid public_image_url", () => {
		it("rejects a plain string that is not a URL", () => {
			expect(
				MonsterImageSchema.safeParse({
					...validMonsterImage,
					public_image_url: "not-a-url",
				}).success,
			).toBe(false);
		});

		it("rejects an empty string — empty string is not a valid URL", () => {
			expect(
				MonsterImageSchema.safeParse({
					...validMonsterImage,
					public_image_url: "",
				}).success,
			).toBe(false);
		});

		it("rejects undefined — the field is nullable (null OK) but not optional (undefined not OK)", () => {
			expect(
				MonsterImageSchema.safeParse({
					...validMonsterImage,
					public_image_url: undefined,
				}).success,
			).toBe(false);
		});
	});

	describe("footguns", () => {
		it("MonsterImage has no updated_at field — an extra updated_at is stripped silently, not an error", () => {
			const result = MonsterImageSchema.safeParse({
				...validMonsterImage,
				updated_at: "2026-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(Object.keys(result.data)).not.toContain("updated_at");
			}
		});

		it("rejects null input", () => {
			expect(MonsterImageSchema.safeParse(null).success).toBe(false);
		});

		it("rejects non-object input", () => {
			expect(MonsterImageSchema.safeParse("a string").success).toBe(false);
		});
	});
});
