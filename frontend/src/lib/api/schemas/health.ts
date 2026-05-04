// ___________________________
// Hand-written Zod schema for the /health endpoint response.
//
// This is a simple health endpoint so it's quite simple, but we'll be glad we did this for more complex endpoint interactions.
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

import { z } from "zod";

import type { paths } from "@/lib/api/__generated__/types";
import type { Assert, AssertExact } from "@/lib/api/type-assertions";

/**
 * Response from our Django api's /health endpoint.
 * If a mismatch occurs here, adjust the path key to match what openapi-typescript generated.
 * From /frontend, run `npm run api:generate` then inspect __generated__/types.ts if unsure.
 */
type HealthResponseFromOpenAPI =
	// `paths` is auto-generated from open-api-typescript based on our Django app
	paths["/health/"]["get"]["responses"][200]["content"]["application/json"];

/**
 * Runtime Zod schema for validating the health endpoint response.
 * This should match the OpenAPI type exactly; we have a type guard to ensure this.
 */
export const HealthResponseSchema = z.object({
	// CharField() in Django produces type: string in OpenAPI — use z.string(), not z.literal("ok").
	// See phase-2-openapi-contract-foundation.md § 8b for the reasoning.
	status: z.string(),
});

/**Response from django /health/endpoint */
export type HealthResponse = z.output<typeof HealthResponseSchema>;

//
/**
 * Compile-time drift check. This line will cause a tsc error if
 * HealthResponseSchema's output type no longer exactly matches the
 * OpenAPI-generated HealthResponseFromOpenAPI type.
 * This variable is purposely not used; it's just to get a compile-time check that these types are in sync.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _HealthResponseSchemaMatchesOpenAPI = Assert<
	AssertExact<HealthResponse, HealthResponseFromOpenAPI>
>;
