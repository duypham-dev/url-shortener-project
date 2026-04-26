import { z } from "zod";
import { ANALYTICS_GROUP_BY_VALUES, TIMESERIES_MODE_VALUES } from "../types/analytics.type.js";

/**
 * analyticsQuerySchema
 *
 * Validates params + query for GET /api/v1/links/:shortCode/analytics?groupBy=...
 * `shortCode` comes from route params; the rest from query string.
 */
export const analyticsQuerySchema = z.object({
  params: z.object({
    shortCode: z
      .string()
      .min(1, "Shortcode is not allowed to be empty")
      .max(15, "Shortcode is not allowed to exceed 15 characters")
      .regex(
        /^[0-9a-zA-Z]+$/,
        "Shortcode is only allowed to contain alphanumeric characters",
      ),
  }),

  query: z.object({
    groupBy: z.enum(ANALYTICS_GROUP_BY_VALUES, {
      message: `groupBy must be one of: ${ANALYTICS_GROUP_BY_VALUES.join(", ")}`,
    }),

    mode: z
      .enum(TIMESERIES_MODE_VALUES, {
        message: `mode must be one of: ${TIMESERIES_MODE_VALUES.join(", ")}`,
      })
      .optional()
      .default("custom"),

    start: z
      .string()
      .optional()
      .default(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString();
      }),

    end: z
      .string()
      .optional()
      .default(() => new Date().toISOString()),

    timezone: z
      .string()
      .regex(
        /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/,
        "timezone must be a valid IANA timezone",
      )
      .optional()
      .default("UTC"),
  }),
});

