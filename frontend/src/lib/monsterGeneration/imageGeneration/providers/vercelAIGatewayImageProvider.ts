import "server-only";

import type { ImageProvider, ImageProviderResult } from "./providersType";

/**
 * Vercel AI sdk provider for Vercel AI sdk image generation.
 *
 * This class satisfies the `ImageProvider` interface contract but does NOT
 * yet make real API calls. It returns a `failed` result so the pipeline
 * fails safely and explicitly rather than silently producing nothing.
 *
 * TODO (Phase 4 Step 18): Fill in `generate()` with the real implementation:
 *   1. Read AI_GATEWAY_API_KEY from the server env module.
 *   2. Call Vercel AI SDK for image generation using server-side size/quality constants.
 *   3. Download the returned image bytes.
 *   4. Return { outcome: "success", imageBytes, mimeType: "image/png" }.
 *   Catch API errors and return { outcome: "failed", safeErrorMessage } —
 *   never let raw OpenAI error messages reach the client.
 */
export class VercelAIGatewayImageProvider implements ImageProvider {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars ---- will be used when we flesh this out
	async generate(_prompt: string): Promise<ImageProviderResult> {
		// Shell: real OpenAI integration is wired in Phase 4 Step 18.
		// Returning `failed` here is deliberate — if real mode is somehow
		// activated before the implementation is complete, the pipeline will
		// surface a clear error rather than silently succeeding with empty data.
		return {
			outcome: "failed",
			safeErrorMessage:
				"Real Vercel AI sdk image provider is not yet implemented. Set IMAGE_GENERATION_MODE=fake.",
		};
	}
}
