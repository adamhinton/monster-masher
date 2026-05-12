// ________
// Shared test fixtures for auth-related tests.
// Exports a validUserProfile matching the UserProfile schema.
// ________
import type { UserProfile } from "@/lib/api/schemas/UserProfileSchema";

/**Example UserProfile for testing */
export const validUserProfile: UserProfile = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	supabase_user_id: "223e4567-e89b-12d3-a456-426614174001",
	email: "test@example.com",
	display_name: null,
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-01T00:00:00.000Z",
};
