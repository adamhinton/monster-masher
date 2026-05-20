// _______________
// Canonical schema for the POST /api/monsters/[id]/generate-image success response.
// Import this instead of redefining it in each component.
// _______________

import z from "zod";

/**
 * Response shape from Django POST /api/monsters/[id]/generate-image/ on success.
 * Shared between the server-side route handler and client components.
 */
export const generateImageSuccessSchema = z.object({
	outcome: z.literal("succeeded"),
	public_image_url: z.string(),
	image_storage_path: z.string(),
});

/**
 * TypeScript type for a successful response from POST /api/monsters/[id]/generate-image/.
 */
export type GenerateImageSuccess = z.infer<typeof generateImageSuccessSchema>;
