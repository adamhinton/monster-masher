// ___________________________
// API Type Assertions
//
// Our auto-generated API types are the source of truth for data coming from the Django API
// But, we're also building Zod schemas for runtime validation.
// So, we use this utility to assert that the output of our Zod schemas matches the OpenAPI types exactly.
// This should cause a TypeScript error if they ever get out of sync, which can happen if we update the OpenAPI spec but forget to update the Zod schemas, or vice versa.
// TODO ongoing - make sure this is applied to data coming from the API.
//
// Usage:
//   type _Check = Assert<IsExact<ZodOutputType, OpenAPIType>>;
//
// If the two types are not exactly equal, tsc will fail on that line.
// ___________________________

export type Assert<T extends true> = T;

export type IsExact<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
			? true
			: false
		: false;
