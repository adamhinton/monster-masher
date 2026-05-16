import "server-only";

import type { ImageProvider, ImageProviderResult } from "./providersType";

/**
 * A minimal 1×1 white PNG encoded as a Buffer.
 *
 * Hardcoded so the fake provider can return realistic-looking image bytes
 * without any external dependencies or filesystem access. The exact content
 * doesn't matter — what matters is that it's valid binary data the rest of
 * the pipeline can pass around (e.g. to a storage abstraction).
 */
const FIXTURE_PNG_BYTES = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==",
	"base64",
);

/**
 * Fake image provider for IMAGE_GENERATION_MODE=fake and unit tests.
 *
 * Responsibilities:
 *   1. Return fixture image bytes so the rest of the pipeline (storage,
 *      moderation, route handler) can be exercised without real API calls.
 *   2. Simulate failure on demand via `shouldFail` so tests can exercise
 *      the failure branch without mocking deeper in the stack.
 *
 * Constraints:
 *   - NEVER imports or references any real provider SDK (OpenAI, etc.).
 *   - NEVER makes any network calls.
 *   - Always returns synchronously-resolved promises (no delays needed here;
 *     the route handler is responsible for any UX-level loading behaviour).
 */
export class FakeImageProvider implements ImageProvider {
	/**
	 * @param shouldFail When `true`, every call to `generate()` returns a
	 *   `failed` result. Use this in tests that need to exercise the failure
	 *   path of the route handler without mocking at a lower level.
	 */
	constructor(private readonly shouldFail = false) {}

	async generate(_prompt: string): Promise<ImageProviderResult> {
		if (this.shouldFail) {
			return {
				outcome: "failed",
				safeErrorMessage: "Fake provider: forced failure for testing.",
			};
		}

		return {
			outcome: "success",
			imageBytes: FIXTURE_PNG_BYTES,
			mimeType: "image/png",
		};
	}
}
