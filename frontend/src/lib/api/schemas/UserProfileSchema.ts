// _____________
// Zod schema for the UserProfile type returned by our Django API.
//
// The bootstrap endpoint (POST /api/me/bootstrap/) returns a UserProfileWithMonsters
// payload — profile fields plus the user's saved monsters with images — so that the
// frontend can hydrate full auth + monster state in a single request.
//
// The Assert<AssertExact<...>> lines are compile-time guards that tsc fails on if
// this schema drifts from what Django's OpenAPI spec declares.
// _____________
import { z } from "zod";

import type { components } from "@/lib/api/__generated__/types";
import type { Assert, AssertExact } from "@/lib/api/type-assertions";
import { MonsterSchema } from "./monster/MonsterSchema";

export const userProfileSchema = z
	.object({
		id: z.uuid(),
		supabase_user_id: z.uuid(),
		email: z.email(),
		display_name: z.string().nullable(),
		// These two are actually Dates but the openAPI generator says they're strings
		// I couldn't get zod to play nice with the dates, so we'll just call them strings; I highly doubt Django/supabase will return them as anything but strings anyway so no validation needed
		created_at: z.string(),
		updated_at: z.string(),
		// Monsters nested inside the user; populated by POST /api/me/bootstrap/.
		// Each monster's `image` field is the most recent MonsterImage or null.
		monsters: z.array(MonsterSchema),
	})
	.readonly();

/**
 * User profile with monsters, as returned by POST /api/me/bootstrap/.
 *
 * Monsters are ordered newest-first and each carries its most recent
 * MonsterImage (or null if no image has been generated yet).
 */
export type UserProfile = z.infer<typeof userProfileSchema>;

// Compile-time drift check against the Django-generated UserProfileWithMonsters schema.
// tsc fails here if the Zod schema drifts from the OpenAPI type.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _UserProfileSchemaMatchesOpenAPI = Assert<
	AssertExact<UserProfile, components["schemas"]["UserProfileWithMonsters"]>
>;
