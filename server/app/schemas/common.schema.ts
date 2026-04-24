import { z } from "zod";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;


export const paginationCoreSchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(MAX_LIMIT, `Limit must be at most ${MAX_LIMIT}`)
    .optional()
    .default(DEFAULT_LIMIT),

  cursor: z.string()
    .regex(/^\d+$/, "Cursor is invalid")
    .optional(),
});