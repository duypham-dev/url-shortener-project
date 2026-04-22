import { z } from "zod";

export const urlSchema = z.object({
    body: z.object({
        originalUrl: z
            .url()
            .max(2048) // Giới hạn tổng độ dài là 2048 ký tự
            .regex(/^https?:\/\//)
    })
})

