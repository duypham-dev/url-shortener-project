/**
 * googleLogin.controller.ts
 *
 * Refactor Notes:
 * - Phase 7: Replaced duplicated REFRESH_TOKEN_COOKIE / COOKIE_OPTIONS with
 *   import from shared cookie.util.ts (single source of truth).
 * - Validation: credential và g_csrf_token đã được validate bởi
 *   validate(googleLoginSchema) middleware trong auth.route.ts.
 *   Controller chỉ còn xử lý CSRF cookie comparison và Google token verify.
 */
import { OAuth2Client } from "google-auth-library";
import { logger } from "../utils/logger.js";
import type { Request, Response } from "express";
import * as oauthService from "../services/auth.service.js";
import { setRefreshTokenCookie } from "../utils/cookie.util.js";

const googleOAuthClient = new OAuth2Client({
  clientId: process.env.GOOGLE_WEB_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_WEB_SECRET as string,
});

/** Frontend URL for OAuth redirects */
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential: idToken, g_csrf_token } = req.body as {
      credential: string;
      g_csrf_token: string;
    };
    const csrfCookie = req.cookies?.g_csrf_token as string | undefined;

    // Verify CSRF token — body token đã được validate bởi middleware (non-empty),
    // còn cookie comparison phải kiểm tra ở đây vì middleware không có access to cookies.
    if (!csrfCookie || g_csrf_token !== csrfCookie) {
      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?oauth=error&message=csrf_invalid`,
      );
    }

    // Verify the ID token with Google
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.redirect(
        `${FRONTEND_URL}/oauth/callback?oauth=error&message=invalid_token`,
      );
    }

    const googleProfile = {
      email: payload.email || "",
      fullName: payload.name || "",
    };

    logger.info("Google token verified", { email: googleProfile.email });

    const { accessToken, refreshToken } =
      await oauthService.findOrCreateOAuthUser(googleProfile);

    setRefreshTokenCookie(res, refreshToken);

    // Access token passed via URL (short-lived, acceptable for redirect)
    return res.redirect(
      `${FRONTEND_URL}/oauth/callback?oauth=success&token=${accessToken}`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error && error.message.includes("Token used too late")
        ? "token_expired"
        : "server_error";

    return res.redirect(
      `${FRONTEND_URL}/oauth/callback?oauth=error&message=${errorMessage}`,
    );
  }
};