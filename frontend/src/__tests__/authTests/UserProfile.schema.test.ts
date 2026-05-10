// ________
// Tests for src/lib/api/schemas/UserProfile.ts
// ________
import { describe, it, expect } from "vitest";
import { userProfileSchema } from "@/lib/api/schemas/UserProfile";
import { validUserProfile } from "../__testUtils__/fixtures";

describe("userProfileSchema", () => {
	it("parses a valid complete profile", () => {
		expect(() => userProfileSchema.parse(validUserProfile)).not.toThrow();
	});

	it("returns the parsed object with correct shape", () => {
		const result = userProfileSchema.parse(validUserProfile);
		expect(result.email).toBe("test@example.com");
		expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
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
