// ─────────────────────────────────────────────────────────────────────────────
// Fetch Metadata / Origin guards for Next.js API route handlers.
//
// These guards protect mutating routes (POST / PATCH / DELETE) from
// cross-site browser requests — e.g. a malicious third-party page that tries
// to trigger state changes on behalf of a logged-in user.
//
// HOW THE CHECK WORKS
// Modern browsers attach a `Sec-Fetch-Site` header to every fetch.  Its value
// is `"cross-site"` when the request originates from a different domain.
// We reject those immediately.
//
// For older browsers (or non-browser clients) that don't send Sec-Fetch-Site,
// we fall back to comparing the `Origin` header against the app's own origin.
// If no `Origin` header is present at all we allow the request — server-side
// callers (curl, server actions, internal jobs) don't send Origin, so blocking
// them would break legitimate non-browser traffic.
//
// RETURN CONVENTION
// Guards return `null` to signal "allowed" or a ready-to-return `NextResponse`
// to signal "blocked".  Routes should check the return value and `return` it
// immediately if non-null.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";

import { type NextApiError } from "@/lib/api/errors";

/**
 * Reject cross-site browser requests to mutating API routes.
 *
 * Call this at the top of every POST / PATCH / DELETE route handler:
 * ```ts
 * const crossSiteResponse = rejectCrossSiteMutatingRequest(request);
 * if (crossSiteResponse) return crossSiteResponse;
 * ```
 *
 * @returns `null` if the request is allowed to proceed.
 * @returns A 403 `NextResponse` if the request appears to be cross-site.
 */
export function rejectCrossSiteMutatingRequest(
	request: NextRequest,
): NextResponse<NextApiError> | null {
	// Fast path: modern browsers set Sec-Fetch-Site on every fetch.
	// "cross-site" unambiguously means the request came from another origin.
	const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
	if (secFetchSite === "cross-site") {
		return forbiddenCrossSiteResponse();
	}

	// Fallback for browsers that don't send Sec-Fetch-Site.
	// If there's no Origin header at all (e.g. server-to-server calls, curl),
	// we allow the request — legitimate non-browser callers never send Origin.
	const origin = request.headers.get("origin");
	if (!origin) return null;

	let parsedOrigin: URL;
	try {
		parsedOrigin = new URL(origin);
	} catch {
		// Unparseable Origin header — reject to be safe.
		return forbiddenCrossSiteResponse();
	}

	if (parsedOrigin.origin !== request.nextUrl.origin) {
		return forbiddenCrossSiteResponse();
	}

	return null;
}

function forbiddenCrossSiteResponse(): NextResponse<NextApiError> {
	return NextResponse.json<NextApiError>(
		{
			error: {
				code: "cross_site_request",
				message: "Cross-site browser requests are not allowed.",
			},
		},
		{ status: 403 },
	);
}
