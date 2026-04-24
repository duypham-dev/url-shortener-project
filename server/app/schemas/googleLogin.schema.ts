import { z } from "zod";
 
/**
 * Validate body of POST /auth/google
 * credential (Google ID token) is required to authenticate with Google.
 * g_csrf_token is required to prevent CSRF attacks.
 */
export const googleLoginSchema = z.object({
  body: z.object({
    credential: z.string().min(1, "Google credential token is required"),
    g_csrf_token: z.string().min(1, "CSRF token is required"),
  }),
});