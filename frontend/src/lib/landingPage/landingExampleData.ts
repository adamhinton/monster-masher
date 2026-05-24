// _______________
// Static example monsters used on the landing page and example gallery routes.
//
// LandingExampleMonster is derived from the existing Monster type — never a
// hand-rolled duplicate. Extra landing-only copy fields are added via intersection.
//
// The `satisfies readonly LandingExampleMonster[]` check on the array provides
// compile-time verification that each object matches the derived type. If the
// Monster type changes (via openapi.yaml → generate:api), TypeScript will surface
// any drift here.
// _______________

import type { Monster } from "@/lib/api/schemas/monster/MonsterSchema";

// ---------------------------------------------------------------------------
// Type: landing-only copy fields
// ---------------------------------------------------------------------------

type LandingCopy = {
	/** One-line elevator pitch shown beneath the monster name. */
	tagline: string;
	/** Accessible alt text for the monster image. */
	alt_text: string;
	/** Suggested filename when the user downloads the portrait. */
	download_filename: string;
};

// ---------------------------------------------------------------------------
// Type: LandingExampleMonster
// ---------------------------------------------------------------------------

/**
 * A landing page example monster.
 *
 * The `image` field is narrowed to non-null because every example always has an image.
 * Landing-only copy fields (tagline, alt_text, download_filename) are added via
 * intersection.
 */
export type LandingExampleMonster = Omit<
	Pick<Monster, "id" | "display_name" | "traits" | "flavor_text" | "image">,
	"image"
> & {
	/** Example monsters always have an image — never null. */
	image: NonNullable<Monster["image"]>;
} & LandingCopy;

// ---------------------------------------------------------------------------
// Static example data
// ---------------------------------------------------------------------------

export const exampleMonsters: readonly LandingExampleMonster[] = [
	{
		id: "49e01917-6db8-5c2c-9f2e-a52f80f246d5",
		display_name: "Magleta",
		traits: {
			element: "Electricity / Steel",
			habitat: "Power outlets",
			personality: "Feisty",
			color_palette: "Steel, white, and yellow",
		},
		flavor_text:
			"This monster lives in power outlets, chomping on spare electricity. If your device is charging slowly, you may need to root this little guy out.",
		image: {
			id: "e684c7f8-c547-483d-b114-c7a81cc64ccc",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/b2b1483b-2926-4ae6-98da-87b6344e9e47/e684c7f8-c547-483d-b114-c7a81cc64ccc.png",
			image_storage_path:
				"monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/b2b1483b-2926-4ae6-98da-87b6344e9e47/e684c7f8-c547-483d-b114-c7a81cc64ccc.png",
			provider: "replicate",
			provider_model: "black-forest-labs/flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		tagline: "Outlet muncher with a taste for spare voltage.",
		alt_text: "Cute electricity and steel monster named Magleta",
		download_filename: "monster-masher-magleta.png",
	},
	{
		id: "8018d9c2-0745-5db3-8ac5-d6f7f8f6969c",
		display_name: "Pyrix",
		traits: {
			element: "Fire",
			habitat: "Back gardens",
			personality: "Hungry and vocal",
			color_palette: "Tabby orange and fire tones",
		},
		flavor_text:
			"This monster is low-maintenance, as long as you feed it spicy food and give it little scritches when you get home.",
		image: {
			id: "2efaf6a3-56b5-4606-88cb-5cf77025b45d",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/c788f5c0-a481-4c87-b133-52f747ccca58/2efaf6a3-56b5-4606-88cb-5cf77025b45d.png",
			image_storage_path:
				"monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/c788f5c0-a481-4c87-b133-52f747ccca58/2efaf6a3-56b5-4606-88cb-5cf77025b45d.png",
			provider: "replicate",
			provider_model: "black-forest-labs/flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		tagline: "Low-maintenance, assuming you brought spicy snacks.",
		alt_text: "Cute fiery tabby monster named Pyrix",
		download_filename: "monster-masher-pyrix.png",
	},
	{
		id: "4e5e06df-a2e5-55f8-b251-36bc325c9418",
		display_name: "QuaWalix",
		traits: {
			element: "Mystical / Ancient",
			habitat: "Ancient forest",
			personality: "Serene",
			color_palette: "Neon blue, white, and gold",
		},
		flavor_text:
			"This ancient dinosaur wanders the forest in search of information about its origins, which are shrouded in mystery.",
		image: {
			id: "cfce1a6b-e27c-4b0a-88e9-028a461383d0",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/a6cbb622-7243-4a39-80b1-81ba9c56e2dd/cfce1a6b-e27c-4b0a-88e9-028a461383d0.png",
			image_storage_path:
				"monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/a6cbb622-7243-4a39-80b1-81ba9c56e2dd/cfce1a6b-e27c-4b0a-88e9-028a461383d0.png",
			provider: "replicate",
			provider_model: "black-forest-labs/flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		tagline: "Ancient forest wanderer looking for its origin story.",
		alt_text: "Cute mystical ancient forest monster named QuaWalix",
		download_filename: "monster-masher-quawalix.png",
	},
	{
		id: "7064f295-5267-55cd-b15d-64631d98f39d",
		display_name: "Ursola",
		traits: {
			element: "Ground / Soul / Grass",
			habitat: "Deep river valley",
			personality: "Combative and territorial",
			color_palette: "Deep green and light brown",
		},
		flavor_text:
			"This bear is always looking for a fight, especially if other monsters wander into its territory. It draws combat power from the sun.",
		image: {
			id: "a01430ab-5f53-48da-bf0a-0d119d7d59dc",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/ecd376b0-31a1-440e-8eed-f1be2d882385/a01430ab-5f53-48da-bf0a-0d119d7d59dc.png",
			image_storage_path:
				"monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/ecd376b0-31a1-440e-8eed-f1be2d882385/a01430ab-5f53-48da-bf0a-0d119d7d59dc.png",
			provider: "replicate",
			provider_model: "black-forest-labs/flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		tagline: "Solar-powered valley bruiser with no patience for trespassers.",
		alt_text: "Cute ground soul and grass bear monster named Ursola",
		download_filename: "monster-masher-ursola.png",
	},
	{
		id: "9f79105c-d8cb-5a16-8d74-9dbb97edb584",
		display_name: "Pemdrath",
		traits: {
			element: "Mysterious / Vinyl / Wood / Medieval",
			habitat: "Chessboard",
			personality: "Ambitious",
			color_palette: "White with black trim",
		},
		flavor_text:
			"Pemdrath was an inanimate pawn before a visit from a mysterious power. He is almost done transforming into a queen. He looks vulnerable, but he will still defend himself if attacked.",
		image: {
			id: "6db13180-8ad9-4af1-a0de-c0782638634b",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/33a3bb89-7ce6-4c97-ab64-781feb368fcc/6db13180-8ad9-4af1-a0de-c0782638634b.png",
			image_storage_path:
				"monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/33a3bb89-7ce6-4c97-ab64-781feb368fcc/6db13180-8ad9-4af1-a0de-c0782638634b.png",
			provider: "replicate",
			provider_model: "black-forest-labs/flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		tagline: "A pawn halfway through becoming something much more dangerous.",
		alt_text: "Cute mysterious chess pawn monster named Pemdrath",
		download_filename: "monster-masher-pemdrath.png",
	},
	{
		id: "433ad09c-203f-53dc-8a0e-1f21143e4e7e",
		display_name: "Ventanilla",
		traits: {
			element: "Wind / Heights / Flying",
			habitat: "Skies",
			personality: "Bold and airy adventurer",
			color_palette: "Many bright colors",
		},
		flavor_text:
			"This animated kite floats the winds of Central America, carefree, going wherever the weather takes it. It avoids confrontation, but can produce blasts of very hot air if provoked.",
		image: {
			id: "197d0bfe-0709-4ab6-8a1f-42340b832943",
			public_image_url:
				"https://jspbqekckumhdgqgthxc.supabase.co/storage/v1/object/public/monster-images/monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/aee3b3e0-18a3-40ac-b13b-f4cff410d1dc/197d0bfe-0709-4ab6-8a1f-42340b832943.png",
			image_storage_path:
				"monster-images/d01c448a-1ab1-4f1d-ac33-3b272a87b03e/aee3b3e0-18a3-40ac-b13b-f4cff410d1dc/197d0bfe-0709-4ab6-8a1f-42340b832943.png",
			provider: "replicate",
			provider_model: "black-forest-labs/flux-dev",
			created_at: "2025-01-01T00:00:00.000Z",
		},
		tagline: "Carefree kite creature with a dangerous hot-air blast.",
		alt_text: "Cute colorful flying kite monster named Ventanilla",
		download_filename: "monster-masher-ventanilla.png",
	},
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Look up a single landing example monster by its ID.
 * Returns undefined when the ID is unknown — caller decides whether to notFound().
 */
export function getExampleMonsterById(
	id: Monster["id"],
): LandingExampleMonster | undefined {
	return exampleMonsters.find((m) => m.id === id);
}

/** The first example monster. Used as the hero image on the about page. */
export const featuredExampleMonster = exampleMonsters[0];

/** Three example monsters shown in the sample-downloads section. */
export const sampleDownloadMonsters = exampleMonsters.slice(0, 3);

/** All six example monsters shown in the example gallery grid. */
export const exampleGalleryMonsters = exampleMonsters;

/** Static route params for generateStaticParams in the example detail route. */
export const exampleMonsterIds = exampleMonsters.map((m) => m.id);
