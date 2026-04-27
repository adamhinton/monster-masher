// _______________
// Helper for accessing env vars in a type-safe way. Only for vars that are used in the frontend code (not backend-only vars like `DJANGO_SECRET_KEY`).
// _______________

const djangoApiBaseUrl = process.env.NEXT_PUBLIC_DJANGO_API_BASE_URL;

if (!djangoApiBaseUrl) {
	throw new Error("Missing NEXT_PUBLIC_DJANGO_API_BASE_URL");
}

export const env = {
	djangoApiBaseUrl: djangoApiBaseUrl.replace(/\/$/, ""),
} as const;
