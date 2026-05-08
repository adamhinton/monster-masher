/**
 * SSR-safe fetch utility for Django API endpoints.
 * Forwards cookies and headers as needed for authentication.
 * Usage: fetchFromDjango("/api/endpoint", { method: "POST", body: ... })
 */
import { cookies, headers } from "next/headers";
import { env } from "../env/env";

/**
 * Fetch from Django backend, forwarding cookies and headers for SSR.
 * @param path Django API path (e.g. "/api/me/bootstrap")
 * @param init Fetch options (method, body, etc)
 */
export async function fetchFromDjango(
	path: string,
	init?: RequestInit,
): Promise<Response> {
	const baseUrl = env.djangoApiBaseUrl;
	const url = baseUrl + path;

	// Forward cookies for SSR authentication
	const cookieHeader = cookies().toString();
	const incomingHeaders = headers();

	// Merge headers: incoming (for SSR), user-provided, and cookies
	const mergedHeaders = {
		...Object.fromEntries((await incomingHeaders).entries()),
		...init?.headers,
		...(cookieHeader ? { Cookie: cookieHeader } : {}),
	};

	return fetch(url, {
		...init,
		headers: mergedHeaders,
		credentials: "include", // Always include cookies
	});
}
