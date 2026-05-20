// ___________________________
// Hand-written Zod schema based on Monster Image data structure gotten from django API.
//
// The Assert<IsExact<...>> line is a compile-time guard. It has no runtime effect.
// If this Zod schema drifts from what the Django backend declares in openapi.yaml,
// tsc will fail here, pointing directly at the mismatch.
//
// When backend types change:
//   1. Update the Django serializer/annotation
//   2. Run `python manage.py spectacular --file openapi.yaml`
//   3. Run `npm run generate:api`
//   4. Fix this Zod schema if tsc now fails on the Assert line
//
// One-image-per-monster design:
//   Each Monster has at most one MonsterImage at any time. Before a new image is
//   generated for a monster that already has one, the old MonsterImage row is
//   deleted via DELETE /api/monsters/{id}/image/. MonsterImageGenerationJob
//   records are preserved as historical records even after their associated image
//   is deleted. See backend/apps/monsters/models.py for the authoritative comment.
// ___________________________

import z from "zod";
import { components } from "../../__generated__/types";
import { Assert, AssertExact } from "../../type-assertions";

type _MonsterImageFromAPI = components["schemas"]["MonsterImage"];

export const MonsterImageSchema = z.object({
	id: z.uuid(),
	public_image_url: z.url().nullable(),
	image_storage_path: z.string().trim(),
	provider: z.string().max(50).trim(),
	provider_model: z.string().max(100).trim(),
	// Date
	created_at: z.string(),
});

export type MonsterImage = z.output<typeof MonsterImageSchema>;

/**
 * Compile-time drift check. tsc fails here if the Zod schema drifts from the OpenAPI type.
 *
 * If you get an error here, it means the MonsterImage type inferred from the Zod schema does not exactly match the MonsterImage type generated from the OpenAPI spec.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _MonsterImageSchemaMatchesOpenAPI = Assert<
	AssertExact<MonsterImage, _MonsterImageFromAPI>
>;
