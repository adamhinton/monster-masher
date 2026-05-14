// ________
// Tests for src/lib/api/schemas/UserProfileSchema.ts
// ________
import { describe, it, expect } from "vitest";
import { userProfileSchema } from "@/lib/api/schemas/UserProfileSchema";
import {
	validUserProfile,
	validUserProfileWithMonsters,
	validMonster,
	validMonsterWithImage,
} from "../__testUtils__/fixtures";

describe("userProfileSchema", () => {
	it("parses a valid complete profile with empty monsters", () => {
		expect(() => userProfileSchema.parse(validUserProfile)).not.toThrow();
	});

	it("parses a profile with populated monsters", () => {
		expect(() =>
			userProfileSchema.parse(validUserProfileWithMonsters),
		).not.toThrow();
	});

	it("returns the parsed object with correct shape", () => {
		const result = userProfileSchema.parse(validUserProfile);
		expect(result.email).toBe("test@example.com");
		expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
	});

	it("monsters is an empty array when no monsters", () => {
		const result = userProfileSchema.parse(validUserProfile);
		expect(result.monsters).toEqual([]);
	});

	it("monsters contains parsed Monster objects", () => {
		const result = userProfileSchema.parse(validUserProfileWithMonsters);
		expect(result.monsters).toHaveLength(2);
		expect(result.monsters[0].display_name).toBe("Gloomspark");
		expect(result.monsters[1].display_name).toBe("Mucksnout");
	});

	it("monsters entries with images parse correctly", () => {
		const result = userProfileSchema.parse(validUserProfileWithMonsters);
		const withImage = result.monsters.find((m) => m.image !== null);
		expect(withImage?.image?.public_image_url).toBe(
			"https://placehold.co/512x512.png",
		);
	});

	it("monsters entries with null image parse correctly", () => {
		const result = userProfileSchema.parse(validUserProfileWithMonsters);
		const withoutImage = result.monsters.find((m) => m.image === null);
		expect(withoutImage?.image).toBeNull();
	});

	it("rejects monsters field missing entirely", () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { monsters: _monsters, ...without } = validUserProfile;
		expect(() => userProfileSchema.parse(without)).toThrow();
	});

	it("rejects monsters that is not an array", () => {
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, monsters: "not-array" }),
		).toThrow();
	});

	it("rejects a monster entry with an invalid id", () => {
		const badMonster = { ...validMonster, id: "not-a-uuid" };
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, monsters: [badMonster] }),
		).toThrow();
	});

	it("rejects a monster entry missing display_name", () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { display_name: _dn, ...badMonster } = validMonster;
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, monsters: [badMonster] }),
		).toThrow();
	});

	it("rejects a monster entry with an invalid image (bad url)", () => {
		const badMonster = {
			...validMonsterWithImage,
			image: { ...validMonsterWithImage.image, public_image_url: "not-a-url" },
		};
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, monsters: [badMonster] }),
		).toThrow();
	});

	it("allows display_name to be null", () => {
		const result = userProfileSchema.parse({
			...validUserProfile,
			display_name: null,
		});
		expect(result.display_name).toBeNull();
	});

	it("allows display_name to be a string", () => {
		const result = userProfileSchema.parse({
			...validUserProfile,
			display_name: "MonsterFan",
		});
		expect(result.display_name).toBe("MonsterFan");
	});

	it("rejects missing email", () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { email: _email, ...without } = validUserProfile;
		expect(() => userProfileSchema.parse(without)).toThrow();
	});

	it("rejects invalid UUID for id", () => {
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, id: "not-a-uuid" }),
		).toThrow();
	});

	it("rejects invalid UUID for supabase_user_id", () => {
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, supabase_user_id: "bad" }),
		).toThrow();
	});

	it("rejects an invalid email string", () => {
		expect(() =>
			userProfileSchema.parse({ ...validUserProfile, email: "notanemail" }),
		).toThrow();
	});

	it("rejects missing id", () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { id: _id, ...without } = validUserProfile;
		expect(() => userProfileSchema.parse(without)).toThrow();
	});
});
