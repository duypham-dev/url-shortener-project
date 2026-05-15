/**
 * qrCode.schema.ts
 *
 * Zod validation schemas for QR code API endpoints.
 * Follow the same shape as link.schema.ts — each schema is a ZodObject
 * wrapping { body?, query?, params? } so the validate middleware can apply it.
 */
import { z } from "zod";
import { paginationCoreSchema } from "./common.schema.js";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ERROR_CORRECTION_VALUES = ["L", "M", "Q", "H"] as const;

// ----------------------------------------------------------------
// POST /api/v1/qr-codes — create a QR code for an existing link
// ----------------------------------------------------------------

export const createQrCodeSchema = z.object({
  body: z.object({
    urlMappingId: z.coerce.bigint(),
    title: z.string().max(255).optional(),
    fgColor: z
      .string()
      .regex(HEX_COLOR_REGEX, "fgColor must be a 6-digit hex color")
      .optional()
      .default("#000000"),
    bgColor: z
      .string()
      .regex(HEX_COLOR_REGEX, "bgColor must be a 6-digit hex color")
      .optional()
      .default("#ffffff"),
    errorCorrection: z
      .enum(ERROR_CORRECTION_VALUES)
      .optional()
      .default("Q"),
    size: z.coerce
      .number()
      .int()
      .min(100, "size must be at least 100px")
      .max(1000, "size must be at most 1000px")
      .optional()
      .default(300),
  }),
});

// ----------------------------------------------------------------
// PATCH /api/v1/qr-codes/:id/regenerate — update visual style
// ----------------------------------------------------------------

export const updateQrCodeSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "id must be a numeric string"),
  }),
  body: z.object({
    title: z.string().max(255).optional().nullable(),
    fgColor: z
      .string()
      .regex(HEX_COLOR_REGEX, "fgColor must be a 6-digit hex color")
      .optional(),
    bgColor: z
      .string()
      .regex(HEX_COLOR_REGEX, "bgColor must be a 6-digit hex color")
      .optional(),
    errorCorrection: z.enum(ERROR_CORRECTION_VALUES).optional(),
    size: z.coerce
      .number()
      .int()
      .min(100)
      .max(1000)
      .optional(),
  }),
});

// ----------------------------------------------------------------
// GET /api/v1/qr-codes — paginated list with filters
// ----------------------------------------------------------------

export const getQrCodesQuerySchema = z.object({
  query: paginationCoreSchema.extend({
    search: z.string().optional(),
    startDate: z.iso.datetime().optional(),
    endDate: z.iso.datetime().optional(),
    urlMappingId: z
      .string()
      .regex(/^\d+$/, "urlMappingId must be a numeric string")
      .optional(),
    status: z.enum(["active", "inactive", "all"]).optional()
  }),
});

// ----------------------------------------------------------------
// Route param: :id — for GET, DELETE, PATCH /:id routes
// ----------------------------------------------------------------

export const qrCodeIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "id must be a numeric string"),
  }),
});
