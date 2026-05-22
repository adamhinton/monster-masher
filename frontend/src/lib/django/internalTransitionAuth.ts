// ─────────────────────────────────────────────────────────────────────────────
// HMAC signing for Next.js → Django internal transition calls.
//
// WHAT THIS IS FOR
// Image-generation job state transitions (mark-running, mark-succeeded,
// mark-failed, mark-blocked) are only valid when triggered by the Next.js
// server, not by a browser user directly.  These helpers let the Next.js
// server prove its identity to Django by signing each request with a shared
// secret that is never exposed to the browser.
//
// HOW THE SIGNATURE WORKS
// The server builds a payload from the HTTP method, request path, a Unix
// timestamp, and the raw request body, then signs it with HMAC-SHA256 using
// the shared secret.  The signature is sent in a custom header alongside the
// timestamp.  Django re-derives the signature from the same inputs and uses
// a constant-time compare to verify it, also checking that the timestamp is
// within an acceptable clock-skew window (default 5 minutes) to prevent
// replay attacks.
//
// The shared secret is set via the NEXT_SERVER_SECRET environment variable
// (falls back to SUPABASE_SECRET_KEY for existing deployments) and the
// INTERNAL_TRANSITION_SECRET Django setting, which must match.
//
// See: backend/apps/common/permissions.py → HasValidInternalTransitionSignature
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";

import { createHmac } from "node:crypto";

import { env } from "@/lib/env/env";
import { HTTP_METHOD } from "next/dist/server/web/http";

/**
 * Build the HMAC authentication headers required by Django transition endpoints.
 *
 * Include these headers in any fetch to a `/generate-image/{action}/` endpoint.
 * Django's `HasValidInternalTransitionSignature` permission will verify them.
 *
 * @param method - HTTP method of the outgoing request (e.g. `"POST"`).
 * @param path   - URL path of the Django endpoint, e.g.
 *                 `"/api/monsters/42/generate-image/mark-succeeded/"`.
 *                 Must match exactly what Django sees — include the trailing
 *                 slash and any query string.
 * @param body   - Raw request body string that will be sent.  Must be identical
 *                 to the body Django will read; any mismatch invalidates the
 *                 signature.
 */
export function createInternalTransitionHeaders({
	method,
	path,
	body,
}: {
	method: HTTP_METHOD;
	path: string;
	body: string;
}): Record<string, string> {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = signTransitionRequest({
		secret: env.serverTransitionSecret,
		method,
		path,
		timestamp,
		body,
	});

	return {
		"X-Monster-Masher-Internal-Timestamp": timestamp,
		"X-Monster-Masher-Internal-Signature": signature,
	};
}

/**
 * Produce an HMAC-SHA256 signature for a transition request.
 *
 * Payload format (fields joined with `\n`):
 *   METHOD\nPATH\nTIMESTAMP_SECONDS\nBODY
 *
 * The signature is returned as `sha256=<hex_digest>` to match the format
 * Django expects in the `X-Monster-Masher-Internal-Signature` header.
 */
function signTransitionRequest({
	secret,
	method,
	path,
	timestamp,
	body,
}: {
	secret: string;
	method: string;
	path: string;
	timestamp: string;
	body: string;
}): string {
	const payload = [method.toUpperCase(), path, timestamp, body].join("\n");
	const digest = createHmac("sha256", secret).update(payload).digest("hex");
	return `sha256=${digest}`;
}
