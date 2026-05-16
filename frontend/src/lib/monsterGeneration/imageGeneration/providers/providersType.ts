import "server-only";

/**
 * Discriminated union representing the two outcomes an AI image provider can produce.
 *
 * `success` — The provider generated an image. `imageBytes` holds the raw binary
 *   data and `mimeType` describes the format (e.g. "image/png").
 *
 * `failed`  — Something went wrong. `safeErrorMessage` is human-readable and safe
 *   to surface in UI — it must never expose internal details, API keys, or
 *   verbatim upstream error messages.
 *
 * NOTE: "blocked" is intentionally absent here. Content moderation blocks are
 * handled by the moderation abstraction BEFORE the provider is called.
 * If the provider itself refuses a prompt (e.g. an NSFW rejection from OpenAI),
 * that maps to `failed`, not a separate `blocked` variant.
 */
export type ImageProviderResult =
	| { outcome: "success"; imageBytes: Buffer; mimeType: string }
	| { outcome: "failed"; safeErrorMessage: string };

/**
 * Contract every image-generation provider must satisfy.
 *
 * Route handlers depend ONLY on this interface, never on a concrete class.
 * This makes it trivial to swap implementations:
 *   - `FakeImageProvider`  → tests and IMAGE_GENERATION_MODE=fake (no API cost)
 *   - `OpenAIImageProvider` → production with IMAGE_GENERATION_MODE=real
 *
 * Always obtain instances via `getImageProvider()` from providers.ts rather
 * than importing concrete classes directly in route handlers.
 */
export interface ImageProvider {
	/**
	 * Generate an image from a text prompt.
	 *
	 * @param prompt Fully-formed text prompt. Callers are responsible for prompt
	 *               construction; the provider treats the string as opaque.
	 */
	generate(prompt: string): Promise<ImageProviderResult>;
}
