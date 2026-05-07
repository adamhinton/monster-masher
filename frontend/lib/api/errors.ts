// _____
// Universal error schema for Next.js route handlers under /app/api.

// Note that this is different from Django error handlers.
// _____

import { z } from "zod";

/**All /app/api route handlers should return error that satisfy this schema. */
export const nextApiErrorSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
	}),
});

/**
 * All /app/api/ route handlers should return errors that satisfy this schema.
 */
export type NextApiError = z.infer<typeof nextApiErrorSchema>;
