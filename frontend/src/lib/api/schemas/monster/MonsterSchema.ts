// ___________________________
// Hand-written Zod schema based on Monster data structure gotten from django API.
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
// ___________________________

import z from "zod";
import { components } from "../../__generated__/types";
import { Assert, AssertExact } from "../../type-assertions";
import { MonsterImageSchema } from "./MonsterImageSchema";

/**Don't use this, it's a reference type
 *
 * This is what we get as a Monster from the django API; then I built a Zod schema based on this in MonsterSchema.ts
 */
type _MonsterFromAPI = components["schemas"]["Monster"];

export const MonsterSchema = z.object({
	id: z.uuid(),
	display_name: z.string().max(80).trim(),
	traits: z.object({
		element: z.string().max(20).trim(),
		habitat: z.string().max(60).trim(),
		personality: z.string().max(60).trim(),
		color_palette: z.string().max(80).trim(),
	}),
	flavor_text: z.string().max(600).trim().optional(),
	// These are dates
	created_at: z.string(),
	updated_at: z.string(),
	// Will be null when no image has been generated yet
	image: MonsterImageSchema.nullable(),
});
export type Monster = z.output<typeof MonsterSchema>;

/**The Monster type built in the user generation form that we will send to Django
 *
 * Use this to validate monsters before sending to the API.
 */
export const MonsterForPOSTSchema = MonsterSchema.pick({
	display_name: true,
	traits: true,
	flavor_text: true,
});

/**Monster data structure that gets sent to Django */
export type MonsterForPOST = z.input<typeof MonsterForPOSTSchema>;

/**
 * Compile-time drift check. tsc fails here if the Zod schema drifts from the OpenAPI type.
 *
 * If you get an error here, it means the Monster type inferred from the Zod schema does not exactly match the Monster type generated from the OpenAPI spec. The error message will show you the exact differences in properties and types, which should help you update the Zod schema to match the API response.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _MonsterSchemaMatchesOpenAPI = Assert<
	AssertExact<Monster, _MonsterFromAPI>
>;
