import "server-only";

/**
 * Fetch utility for Django API endpoints.
 *
 * This is a thin wrapper around `fetch` that constructs the full URL to the Django backend. Designed to handle both simple paths and parameterized paths with `{param}` placeholders, such as when you pass in an ID.
 *
 * Two overloads:
 *   fetchFromDjango("/api/simple-path/", init?)
 *   fetchFromDjango("/api/path/{param}/", { param: "value" }, init?)
 */
import { env } from "../env/env";
import {
	UserProfile,
	userProfileSchema,
} from "../api/schemas/UserProfileSchema";
import { paths } from "../api/__generated__/types";

/** Extracts all `{param}` names from a path template string. */
type PathParams<T extends string> =
	T extends `${string}{${infer Param}}${infer Rest}`
		? Param | PathParams<Rest>
		: never;

/** Paths that have no `{param}` placeholders. */
type SimplePath = {
	[K in keyof paths]: PathParams<K> extends never ? K : never;
}[keyof paths];

/** Paths that have at least one `{param}` placeholder, such as monsterID.. */
type ParameterizedPath = Exclude<keyof paths, SimplePath>;

/**
 * Fetch from Django backend for a path with no URL parameters.
 * @param path Exact Django API path (e.g. "/api/me/bootstrap/")
 * @param init Fetch options (method, body, headers, etc.)
 */
export async function fetchFromDjango(
	path: SimplePath,
	init?: RequestInit,
): Promise<Response>;

/**
 * Fetch from Django backend for a path containing `{param}` placeholders.
 * @param path Template path (e.g. "/api/monsters/{monster_id}/")
 * @param pathParams Values to substitute for each `{param}` in the path
 * @param init Fetch options (method, body, headers, etc.)
 */
export async function fetchFromDjango<P extends ParameterizedPath>(
	path: P,
	pathParams: Record<PathParams<P>, string>,
	init?: RequestInit,
): Promise<Response>;

export async function fetchFromDjango(
	path: string,
	pathParamsOrInit?: Record<string, string> | RequestInit,
	init?: RequestInit,
): Promise<Response> {
	let resolvedPath: string;
	let requestInit: RequestInit | undefined;

	if (path.includes("{")) {
		const pathParams = pathParamsOrInit as Record<string, string> | undefined;
		resolvedPath = Object.entries(pathParams ?? {}).reduce(
			(p, [key, value]) => p.replace(`{${key}}`, value),
			path,
		);
		requestInit = init;
	} else {
		resolvedPath = path;
		requestInit = pathParamsOrInit as RequestInit | undefined;
	}

	const url = `${env.djangoApiBaseUrl}${resolvedPath}`;

	return fetch(url, {
		...requestInit,
		headers: requestInit?.headers,
	});
}

/**
 * Gets profile info + monsters for the currently logged-in user from Django.
 *
 * Calls POST /api/me/bootstrap/ which returns a UserProfileWithMonsters payload —
 * profile fields plus all saved monsters (each with their most recent image or null).
 * This single call hydrates the full initial auth state in one round-trip.
 *
 * Returns the validated UserProfile (which includes monsters).
 * Throws specific errors for network issues, response errors, or validation failures.
 */
export async function fetchLoggedInDjangoUserProfile(
	accessToken: string,
): Promise<UserProfile> {
	try {
		const response = await fetchFromDjango("/api/me/bootstrap/", {
			method: "POST",
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch profile. Status: ${response.status}`);
		}

		const raw: unknown = await response.json();

		try {
			return userProfileSchema.parse(raw);
		} catch (validationError) {
			throw new Error(
				`Profile validation failed: ${validationError instanceof Error ? validationError.message : validationError}`,
			);
		}
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error("Failed to parse response JSON.");
		} else if (error instanceof TypeError) {
			throw new Error("Network error or request failed.");
		} else {
			throw new Error(
				`Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
