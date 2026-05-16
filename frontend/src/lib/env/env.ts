// _______________
// Helper for accessing env vars in a type-safe way. Only for vars that are used in the frontend code (not backend-only vars like `DJANGO_SECRET_KEY`).
// Validation is lazy (via getters) so importing this module never throws — only
// accessing a missing variable does. This prevents build-time prerender failures
// on pages that don't need every variable.
// NOTE: NEXT_PUBLIC_* vars must be referenced with literal dot notation
// (process.env.NEXT_PUBLIC_FOO) so Next.js can statically inline them at build time.
// Dynamic bracket access (process.env[name]) bypasses inlining and always yields undefined.
// _______________

function assertDefined(value: string | undefined, name: string): string {
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

/**
 * Type-safe way to access environment variables on frontend.
 */
export const env = {
	get djangoApiBaseUrl() {
		return assertDefined(
			process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL,
			"NEXT_PUBLIC_DJANGO_API_BASE_URL",
		).replace(/\/$/, "");
	},
	get supabaseUrl() {
		return assertDefined(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			"NEXT_PUBLIC_SUPABASE_URL",
		);
	},
	get supabasePublishableKey() {
		return assertDefined(
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
		);
	},
	get appUrl() {
		return assertDefined(
			process.env.NEXT_PUBLIC_APP_URL,
			"NEXT_PUBLIC_APP_URL",
		);
	},
	// IMAGE_GENERATION_MODE "fake" | "real"
	get imageGenerationMode() {
		const value = assertDefined(
			process.env.IMAGE_GENERATION_MODE,
			"IMAGE_GENERATION_MODE",
		);
		if (value !== "fake" && value !== "real") {
			throw new Error(
				`Invalid IMAGE_GENERATION_MODE: ${value}. Must be "fake" or "real".`,
			);
		}
		return value;
	},
	get openAIApiKey() {
		return assertDefined(process.env.OPENAI_API_KEY, "OPENAI_API_KEY");
	},

	get supabaseStorageBucket() {
		return assertDefined(
			process.env.SUPABASE_STORAGE_BUCKET,
			"SUPABASE_STORAGE_BUCKET",
		);
	},
	get supabaseSecretKey() {
		return assertDefined(
			process.env.SUPABASE_SECRET_KEY,
			"SUPABASE_SECRET_KEY",
		);
	},
};
