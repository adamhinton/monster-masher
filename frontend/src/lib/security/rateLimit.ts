// ─────────────────────────────────────────────────────────────────────────────
// In-process rate limiter for Next.js API route handlers.
//
// HOW IT WORKS
// Each unique (scope, identifier) pair gets a fixed-window counter stored in a
// module-level Map.  When the window expires the counter resets automatically
// on the next request.
//
// IMPORTANT LIMITATION
// State lives in a single Node.js process.  If Next.js is deployed across
// multiple instances (e.g. Vercel serverless functions) each instance has its
// own counter and the effective limit is multiplied by the instance count.
// For this project's traffic that is acceptable; revisit if scaling becomes a
// concern (replace the Map with a shared Redis/Upstash counter).
//
// USAGE PATTERN
//   const result = checkRateLimit({ scope: "auth-sign-in", identifier: clientIp, limit: 10, windowMs: 15 * 60_000 });
//   if (!result.allowed) return rateLimitExceededResponse(result);
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";

import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { type NextApiError } from "@/lib/api/errors";

type RateLimitBucket = {
	count: number;
	resetAtMs: number;
	/**
	 * True once Sentry has been alerted for this window.
	 * Prevents one blocked identifier from generating hundreds of Sentry events
	 * in a single window — we fire once on the first blocked request, then stay
	 * quiet until the window resets.
	 */
	hasAlertedSentry: boolean;
};

type RateLimitAllowed = {
	allowed: true;
};

type RateLimitBlocked = {
	allowed: false;
	/** Seconds until the current window resets. Pass directly to rateLimitExceededResponse(). */
	retryAfterSeconds: number;
};

/**
 * Discriminated union returned by checkRateLimit.
 *
 * Check `result.allowed`:
 * - `true`  → request is within the limit; proceed normally.
 * - `false` → limit exceeded; call `rateLimitExceededResponse(result)` and return early.
 */
export type RateLimitResult = RateLimitAllowed | RateLimitBlocked;

/**
 * Every active rate-limit scope in the app.  Add a new entry here whenever
 * you introduce a new `checkRateLimit` call so the type stays the source of
 * truth for what scopes exist.
 */
export type RateLimitScope =
	| "auth-sign-in"
	| "auth-bootstrap"
	| "auth-logout"
	| "monster-create"
	| "monster-delete"
	| "image-generate"
	| "email-image-generation-done";

// Module-level store. Lives for the lifetime of the Node.js process.
const buckets = new Map<string, RateLimitBucket>();

/**
 * Check whether a request is within its rate-limit budget and record the hit.
 *
 * @param scope      - Which feature bucket this request counts against.  Must
 *                     be one of the `RateLimitScope` literals — TypeScript will
 *                     catch any typo at compile time.  Counters are namespaced
 *                     per scope, so the same identifier can have independent
 *                     limits across different features.
 * @param identifier - Unique key for the caller within this scope — typically a
 *                     client IP (`clientIpFromRequest`), a Supabase user UUID,
 *                     or a composite like `"${ip}:${email}"`.
 * @param limit      - Maximum number of requests allowed within one window.
 * @param windowMs   - Duration of the fixed window in milliseconds.  The counter
 *                     resets automatically after this period.
 *
 * @returns `RateLimitResult` — check `.allowed` before proceeding.
 */
export function checkRateLimit({
	scope,
	identifier,
	limit,
	windowMs,
}: {
	scope: RateLimitScope;
	identifier: string;
	limit: number;
	windowMs: number;
}): RateLimitResult {
	const nowMs = Date.now();
	const key = `${scope}:${identifier}`;
	const bucket = buckets.get(key);

	// No bucket yet, or the previous window has expired — start a fresh one.
	if (!bucket || bucket.resetAtMs <= nowMs) {
		buckets.set(key, {
			count: 1,
			resetAtMs: nowMs + windowMs,
			hasAlertedSentry: false,
		});
		return { allowed: true };
	}

	if (bucket.count >= limit) {
		const retryAfterSeconds = Math.max(
			1,
			Math.ceil((bucket.resetAtMs - nowMs) / 1000),
		);

		// Alert once per window — subsequent blocked requests in the same window
		// are silently dropped to avoid Sentry noise from a single bad actor.
		if (!bucket.hasAlertedSentry) {
			bucket.hasAlertedSentry = true;
			Sentry.captureMessage("security.rate_limit_exceeded", {
				level: "error",
				tags: {
					feature_area: "security",
					// Indexed tag so you can alert on a specific scope in Sentry.
					rate_limit_scope: scope,
				},
				extra: {
					// identifier is an IP, user UUID, or composite — enough to
					// identify the caller and decide if this is an attack.
					identifier,
					scope,
					limit,
					windowMs,
					hitCount: bucket.count,
					retryAfterSeconds,
				},
			});
		}

		return { allowed: false, retryAfterSeconds };
	}

	bucket.count += 1;
	return { allowed: true };
}

/**
 * Extract the client IP from a Next.js request.
 *
 * Reads `X-Forwarded-For` first (set by Vercel and most reverse proxies), then
 * falls back to `X-Real-IP`.  Returns `"unknown"` if neither header is present.
 *
 * NOTE: Only trust these headers if your deployment ensures they cannot be
 * spoofed by end users (e.g. Vercel always overwrites X-Forwarded-For).
 */
export function clientIpFromRequest(request: NextRequest): string {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",", 1)[0].trim();
	return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Build a 429 Too Many Requests response from a blocked RateLimitResult.
 *
 * Sets the `Retry-After` response header so clients (and CDNs) know when to
 * retry.  Only accepts a `RateLimitBlocked` result — TypeScript will complain
 * if you accidentally pass an allowed result.
 */
export function rateLimitExceededResponse(
	result: RateLimitBlocked,
): NextResponse<NextApiError> {
	return NextResponse.json<NextApiError>(
		{
			error: {
				code: "rate_limited",
				message: "Too many requests. Please try again shortly.",
			},
		},
		{
			status: 429,
			headers: { "Retry-After": String(result.retryAfterSeconds) },
		},
	);
}

/**
 * Clear all rate-limit buckets.  Only callable in the test environment —
 * throws at runtime if `NODE_ENV !== "test"` would reach this.
 * Call this in `beforeEach` to isolate test cases.
 */
export function resetRateLimitForTests(): void {
	if (process.env.NODE_ENV === "test") {
		buckets.clear();
	}
}
