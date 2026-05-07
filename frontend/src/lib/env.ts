// _______________
// Helper for accessing env vars in a type-safe way. Only for vars that are used in the frontend code (not backend-only vars like `DJANGO_SECRET_KEY`).
// _______________

const djangoApiBaseUrl = process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!djangoApiBaseUrl) {
	throw new Error("Missing NEXT_PUBLIC_DJANGO_API_BASE_URL");
}
if (!supabaseUrl) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabasePublishableKey) {
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
if (!appUrl) {
	throw new Error("Missing NEXT_PUBLIC_APP_URL");
}

/**
 * Type-safe way to access environment variables on frontend.
 */
export const env = {
	djangoApiBaseUrl: djangoApiBaseUrl.replace(/\/$/, ""),
	supabaseUrl,
	supabasePublishableKey,
	appUrl,
} as const;
