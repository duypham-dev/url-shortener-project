import { z } from "zod";
import { paginationCoreSchema } from "./common.schema";

// Custom alias: 3–30 chars, only URL-safe characters (letters, digits, hyphens, underscores)
const customAliasSchema = z
  .string()
  .min(3, "Custom alias must be at least 3 characters")
  .max(30, "Custom alias must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Custom alias may only contain letters, numbers, hyphens, and underscores",
  );

export const urlSchema = z.object({
  body: z.object({
    originalUrl: z
      .string()
      .url()
      .max(2048) // Giới hạn tổng độ dài là 2048 ký tự
      .regex(/^https?:\/\//),
    title: z.string().max(255).optional(),
    generateQr: z.boolean().optional().default(false),
    qrOptions: z
      .object({
        fgColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        bgColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
      })
      .optional(),
    // Phase 5 — custom alias (optional; if omitted, base62 is used)
    customAlias: customAliasSchema.optional(),
    // Phase 4 — link expiry (optional ISO datetime string)
    expiresAt: z.iso.datetime({ offset: true }).optional().nullable(),
  }),
});

export const getLinksQuerySchema = z.object({
  query: paginationCoreSchema.extend({
    search: z.string().optional(),
    startDate: z.iso.datetime().optional(),
    endDate: z.iso.datetime().optional(),
    sortBy: z.enum(["title", "createdAt", "clickCount"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

export const updateLinkSchema = z.object({
  params: z.object({
    shortCode: z.string().min(1),
  }),
  body: z.object({
    title: z.string().max(255).optional(),
  }),
});
