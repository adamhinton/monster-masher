// ________
// Shared test fixtures for auth-related tests.
// Exports validUserProfile (with monsters) and validMonster matching their schemas.
// ________
import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";
import type { UserProfile } from "@/lib/api/schemas/UserProfileSchema";

/**Example Monster (no image) for testing */
export const validMonster: Monster = {
	id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
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
	image: null,
};

/**Example Monster with an image for testing */
export const validMonsterWithImage: Monster = {
	...validMonster,
	id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
	display_name: "Gloomspark",
	image: {
		id: "cccccccc-cccc-4ccc-9ccc-cccccccccccc",
		public_image_url: "https://placehold.co/512x512.png",
		image_storage_path: "monsters/test.png",
		provider: "fake",
		provider_model: "fake-fixture-v1",
		created_at: "2026-01-02T00:00:00.000Z",
	},
};

/**Example UserProfile (with empty monsters list) for testing */
export const validUserProfile: UserProfile = {
	id: "123e4567-e89b-12d3-a456-426614174000",
	supabase_user_id: "223e4567-e89b-12d3-a456-426614174001",
	email: "test@example.com",
	display_name: null,
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-01T00:00:00.000Z",
	monsters: [],
};

/**Example UserProfile with monsters for testing */
export const validUserProfileWithMonsters: UserProfile = {
	...validUserProfile,
	monsters: [validMonsterWithImage, validMonster],
};
