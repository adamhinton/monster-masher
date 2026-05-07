// _______________
// Helper for accessing env vars in a type-safe way. Only for vars that are used in the frontend code (not backend-only vars like `DJANGO_SECRET_KEY`).
// Validation is lazy (via getters) so importing this module never throws — only
// accessing a missing variable does. This prevents build-time prerender failures
// on pages that don't need every variable.
// _______________

function requireEnv(name: string): string {
	const value = process.env[name as keyof typeof process.env];
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

/**
 * Type-safe way to access environment variables on frontend.
 */
export const env = {
	get djangoApiBaseUrl() {
		return requireEnv("NEXT_PUBLIC_DJANGO_API_BASE_URL").replace(/\/$/, "");
	},
	get supabaseUrl() {
		return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
	},
	get supabasePublishableKey() {
		return requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
	},
	get appUrl() {
		return requireEnv("NEXT_PUBLIC_APP_URL");
	},
};
