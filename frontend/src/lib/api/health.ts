// _________________
// Helper for Django health check API. This is used in the frontend to check if the backend is healthy.
// _________________

import { env } from "@/lib/env";
import { HealthResponse, HealthResponseSchema } from "./schemas/health";

/**Frontend helper to make sure the backend is healthy via /health endpoint */
export async function fetchDjangoHealth(): Promise<HealthResponse> {
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

	return HealthResponseSchema.parse(data);
}
