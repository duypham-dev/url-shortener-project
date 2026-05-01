import { z } from "zod";
import { paginationCoreSchema } from "./common.schema";

export const urlSchema = z.object({
    body: z.object({
        originalUrl: z
            .string()
            .url()
            .max(2048) // Giới hạn tổng độ dài là 2048 ký tự
            .regex(/^https?:\/\//),
        generateQr: z.boolean().optional().default(false),
        qrOptions: z.object({
            fgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
            bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        }).optional(),
    })
})

export const getLinksQuerySchema = z.object({
  query: paginationCoreSchema.extend({
    search: z.string().optional(),
    startDate: z.iso.datetime().optional(),
    endDate: z.iso.datetime().optional(),
    sortBy: z.enum(["title", "createdAt", "clickCount"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
});

export const updateLinkSchema = z.object({
  params: z.object({
    shortCode: z.string().min(1),
  }),
  body: z.object({
    title: z.string().max(255).optional(),
  }),
});
