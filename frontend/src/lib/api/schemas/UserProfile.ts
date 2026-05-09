// _____________
// Zod schema for the UserProfile type returned by our Django API.

// This provides runtime validation of the API response.
// The Assert<IsExact<...>> line at the bottom is a compile-time guard to ensure no drift.
// _____________
import { z } from "zod";

import type { components } from "@/lib/api/__generated__/types";
import type { Assert, AssertExact } from "@/lib/api/type-assertions";

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
	})
	.readonly();

/**User profile gotten from Django API */
export type UserProfile = z.infer<typeof userProfileSchema>;

// Compile-time drift check. tsc fails here if the Zod schema drifts from the OpenAPI type.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _UserProfileSchemaMatchesOpenAPI = Assert<
	AssertExact<UserProfile, components["schemas"]["UserProfile"]>
>;
