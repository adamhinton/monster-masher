import { z } from "zod";

/**
 * Response shape from Django GET /api/me/image-gens-remaining/.
 * Shared between the server-side route handler and client components.
 *
 * Details how many image generations the user has available in the current rolling 24-hour period.
 */
export const imageGensRemainingSchema = z.object({
	num_remaining: z.number().int().nonnegative(),
	max_per_day: z.number().int().positive(),
	used_today: z.number().int().nonnegative(),
});

/**Details how many image generations the user has available in the current rolling 24-hour period. */
export type ImageGensRemaining = z.infer<typeof imageGensRemainingSchema>;
