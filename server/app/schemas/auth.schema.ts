import { z } from "zod";

//Base Password
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number");

// Register Schema
export const registerSchema = z.object({
    body: z.object({
        fullName: z
            .string("Fullname is required")
            .trim()
            .min(3, "Fullname must be at least 3 characters long")
            .max(50, "Fullname must be at most 50 characters long")
            .regex(/^[a-zA-Z]+$/, "Fullname cannot contain special characters"),
        email: z.email(),
        password: passwordSchema
    })
})

// Login Schema
export const loginSchema = z.object({
    body: z.object({
        email: z.email(),
        password: z
            .string()
            .min(1, "Password is required")
    })
})

// Export TypeScript Types
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];