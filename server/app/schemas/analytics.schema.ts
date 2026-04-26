import { z } from "zod";
import { ANALYTICS_GROUP_BY_VALUES, TIMESERIES_MODE_VALUES } from "../types/analytics.type.js";

const MAX_CUSTOM_RANGE_DAYS = 30;

/**
 * analyticsQuerySchema
 *
 * Validates params + query for GET /api/v1/links/:shortCode/analytics?groupBy=...
 * `shortCode` comes from route params; the rest from query string.
 *
 * When mode = "custom", `start` and `end` are required and the span
 * must not exceed MAX_CUSTOM_RANGE_DAYS (30 days).
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

  query: z
    .object({
      groupBy: z.enum(ANALYTICS_GROUP_BY_VALUES, {
        message: `groupBy must be one of: ${ANALYTICS_GROUP_BY_VALUES.join(", ")}`,
      }),

      mode: z
        .enum(TIMESERIES_MODE_VALUES, {
          message: `mode must be one of: ${TIMESERIES_MODE_VALUES.join(", ")}`,
        })
        .optional()
        .default("last7d"),

      start: z.string().optional(),
      end: z.string().optional(),

      timezone: z
        .string()
        .regex(
          /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/,
          "timezone must be a valid IANA timezone",
        )
        .optional()
        .default("UTC"),
    })
    .superRefine((data, ctx) => {
      // Custom mode requires start and end within 30-day span
      if (data.mode === "custom") {
        if (!data.start || !data.end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "start and end are required when mode is 'custom'.",
            path: ["start"],
          });
          return;
        }

        const startDate = new Date(data.start);
        const endDate = new Date(data.end);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "start and end must be valid ISO date strings.",
            path: ["start"],
          });
          return;
        }

        if (startDate > endDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "start must be before or equal to end.",
            path: ["start"],
          });
          return;
        }

        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays > MAX_CUSTOM_RANGE_DAYS) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Custom date range must not exceed ${MAX_CUSTOM_RANGE_DAYS} days.`,
            path: ["start"],
          });
        }
      }
    }),
});
