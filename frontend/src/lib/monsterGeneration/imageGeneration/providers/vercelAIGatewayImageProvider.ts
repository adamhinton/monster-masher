import "server-only";

import { createGateway, generateImage } from "ai";

import { env } from "@/lib/env/env";
import type { ImageProvider, ImageProviderResult } from "./providersType";

/**
 * Timeout for image generation requests
 * Vercel AI SDK image generation can take a while; abort after this duration.
 */
const IMAGE_GENERATION_TIMEOUT_MS = 90_000;

/**
 * Vercel AI Gateway image provider.
 *
 * Calls the Vercel AI Gateway (via the `ai` SDK) using the model and API key
 * configured in the server environment. Returns raw image bytes so the rest
 * of the pipeline (storage, route handler) can handle them independently.
 *
 * Security:
 *   - Never exposes raw SDK errors to callers — safeErrorMessage is always
 *     a generic, client-safe string.
 *   - Never logs the full error body (it may contain the prompt or API keys).
 *
 * Only active when IMAGE_GENERATION_MODE=real. Use FakeImageProvider for
 * tests and fake mode.
 */
export class VercelAIGatewayImageProvider implements ImageProvider {
	async generate(prompt: string): Promise<ImageProviderResult> {
		const abortController = new AbortController();
		const timeoutId = setTimeout(
			() => abortController.abort(),
			IMAGE_GENERATION_TIMEOUT_MS,
		);

		try {
			const gateway = createGateway({ apiKey: env.vercelAIGatewayAPIKey });
			const { image } = await generateImage({
				model: gateway.image(env.vercelAIImageModel),
				prompt,
				abortSignal: abortController.signal,
			});

			return {
				outcome: "success",
				imageBytes: Buffer.from(image.uint8Array),
				mimeType: image.mediaType,
			};
		} catch {
			if (abortController.signal.aborted) {
				return {
					outcome: "failed",
					safeErrorMessage: "Image generation timed out.",
				};
			}
			// Do not log the full error body — it may contain the prompt or API keys.
			console.error("[VercelAIGatewayImageProvider] Image generation failed");
			return {
				outcome: "failed",
				safeErrorMessage: "Image generation failed. Please try again.",
			};
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
