// _____________
// Ensures users are redirected to safe path after login etc.
// Prevents malicious outside redirect links like /login?next=https://evil.com
// _____________

/**Path we send user to after they're logged in */
export const DEFAULT_AUTH_REDIRECT_PATH = "/gallery";

/**
 * This has to do with where the user is auto-redirected after signin
 *
 * A security measure to prevent a scam redirect link someone could send like /login?next=https://evil.com
 *
 * @param value the next path to redirect to after login, from the query param
 * @returns /gallery path if the value is not a safe path (outside links, etc), otherwise the value itself
 */
export function getSafeNextPath(value: string | null): string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) {
		return DEFAULT_AUTH_REDIRECT_PATH;
	}

	return value;
}
