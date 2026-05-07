// _________________
// Helper for Django health check API. This is used in the frontend to check if the backend is healthy.
// _________________

import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env/env";
import { HealthResponse, HealthResponseSchema } from "./schemas/health";

/**Frontend helper to make sure the backend is healthy via /health endpoint */
export async function fetchDjangoHealth(): Promise<HealthResponse> {
	console.log("env.djangoApiBaseUrl:", env.djangoApiBaseUrl);
	const response = await fetch(`${env.djangoApiBaseUrl}/health`, {
		method: "GET",
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(
			`Django health check failed: ${response.status} ${response.statusText}`,
		);
	}

	const data: unknown = await response.json();

	let parsed: HealthResponse;
	try {
		parsed = HealthResponseSchema.parse(data);
	} catch (err) {
		// Zod validation failure means the backend response no longer matches the
		// expected contract. This is a contract drift event — we want an immediate
		// Sentry alert, not just a log.
		// /health returns only {"status": "ok"} — no auth tokens or secrets in rawResponse.
		Sentry.captureException(err, {
			tags: {
				type: "api_contract_drift",
				endpoint: "/health",
			},
			extra: {
				rawResponse: data,
			},
		});
		throw err;
	}
	return parsed;
}
