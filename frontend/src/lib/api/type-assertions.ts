// ___________________________
// API Type Assertions
//
// Our auto-generated API types are the source of truth for data coming from the Django API.
// But, we're also building Zod schemas for runtime validation.

// So, we use this utility to assert that the output of our Zod schemas matches the OpenAPI types exactly.

// This should cause a TypeScript error if they ever get out of sync, which can happen if we update the OpenAPI spec but forget to update the Zod schemas, or vice versa.
// TODO ongoing - make sure this is applied to data coming from the API.
//
// Usage: Put this at the bottom of any Zod schema file that replicates data retrieved from the API, and replace ZodOutputType and OpenAPIType with the appropriate types. For example:
//   type _Check = Assert<AssertExact<ZodOutputType, OpenAPIType>>;
//
// If the two types are not exactly equal, tsc will fail on that line.
// ___________________________

export type Assert<T extends true> = T;

/**Don't use IsExact, it's a helper for AssertExact which is defined below */
export type IsExact<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
			? true
			: false
		: false;

/**
 * Helper for making sure our Zod schema output types exactly match our OpenAPI-generated types.
 *
 * Resolves to `true` when manually-written zod schema output type exactly matches the OpenAPI-generated type, otherwise resolves to an object describing the mismatch.\
 *
 * This is used in a compile-time assertion to ensure our Zod schemas stay in sync with our OpenAPI types.
 *
 * Usage: type _Check = Assert<AssertExact<ZodOutputType, OpenAPIType>>;
 */
export type AssertExact<ZodOutput, OpenAPIType> =
	IsExact<ZodOutput, OpenAPIType> extends true
		? true
		: {
				error: "API contract drift — Zod schema does not match OpenAPI type";
				zodOutput: ZodOutput;
				openAPIType: OpenAPIType;
			};
