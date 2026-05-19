// ___________________________
// API Type Assertions
//
// Our auto-generated API types are the source of truth for data coming from the Django API.
// But, we're also building Zod schemas for runtime validation.

// So, we use this utility to assert that the output of our Zod schemas matches the OpenAPI types exactly.

// This should cause a TypeScript error if they ever get out of sync, which can happen if we update the OpenAPI spec but forget to update the Zod schemas, or vice versa.
//
// Usage: Put this at the bottom of any Zod schema file that replicates data retrieved from the API, and replace ZodOutputType and OpenAPIType with the appropriate types. For example:
//   type _Check = Assert<AssertExact<ZodOutputType, OpenAPIType>>;
//
// If the two types are not exactly equal, tsc will fail on that line.
// ___________________________

export type Assert<T extends true> = T;

/**
 * Resolves to `true` if `A` is assignable to `B` (i.e. A extends B), `false` otherwise.
 * Use with `Assert` to get a compile-time failure when a narrower type no longer satisfies a wider one.
 *
 * Usage: type _Check = Assert<IsAssignableTo<NarrowType, WiderType>>;
 */
export type IsAssignableTo<A, B> = A extends B ? true : false;

/** Don't use IsExact directly — it's a helper for AssertExact */
export type IsExact<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
			? true
			: false
		: false;

/**
 * Recursively strips `readonly` modifiers from all properties and array types.
 *
 * Zod v3 cannot express partial readonly (some properties readonly, others not),
 * so `AssertExact` strips readonly from both sides before comparing. This means
 * we still catch mismatches in property names, value types, and optionality —
 * just not readonly modifiers.
 */
type DeepMutable<T> =
	T extends ReadonlyArray<infer U>
		? Array<DeepMutable<U>>
		: T extends object
			? { -readonly [K in keyof T]: DeepMutable<T[K]> }
			: T;

/**
 * Shows only the keys that differ between two object types.
 * Each differing key shows what your Zod schema has vs what the OpenAPI spec requires.
 */
type PropertyDiff<A, B> = {
	[K in keyof A | keyof B as IsExact<
		K extends keyof A ? A[K] : never,
		K extends keyof B ? B[K] : never
	> extends true
		? never
		: K]: {
		zod: K extends keyof A ? A[K] : "⚠ key missing in Zod schema";
		api: K extends keyof B ? B[K] : "⚠ key missing in OpenAPI type";
	};
};

/**
 * Helper for making sure our Zod schema output types exactly match our OpenAPI-generated types.
 *
 * `readonly` modifiers are stripped from both sides before comparing, because Zod v3 cannot
 * express partial readonly on object properties. Shape, optionality, and value types ARE checked.
 *
 * Resolves to `true` when they match. When they don't, resolves to an error object with
 * `per_key_diff` — hover each key to see exactly what your Zod type has vs what the OpenAPI
 * spec requires.
 *
 * Usage: type _Check = Assert<AssertExact<ZodOutputType, OpenAPIType>>;
 */
export type AssertExact<ZodOutput, OpenAPIType> =
	IsExact<DeepMutable<ZodOutput>, DeepMutable<OpenAPIType>> extends true
		? true
		: {
				error: "API contract drift — Zod schema does not match OpenAPI type";
				/** Hover each key to see what your Zod schema has vs what the OpenAPI spec requires */
				per_key_diff: PropertyDiff<
					DeepMutable<ZodOutput>,
					DeepMutable<OpenAPIType>
				>;
			};
