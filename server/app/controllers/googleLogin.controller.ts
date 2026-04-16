/**
 * googleLogin.controller.ts
 *
 * Refactor Notes:
 * - Phase 7: Replaced duplicated REFRESH_TOKEN_COOKIE / COOKIE_OPTIONS with
 *   import from shared cookie.util.ts (single source of truth).
 */
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';
import type {Request, Response} from "express";
import * as oauthService from '../services/auth.service';
import { setRefreshTokenCookie } from '../utils/cookie.util';

const googleOAuthClient = new OAuth2Client({
  clientId: process.env.GOOGLE_WEB_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_WEB_SECRET as string,
});

/** Frontend URL for OAuth redirects */
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential: idToken, g_csrf_token } = req.body;
    const csrfCookie = req.cookies?.g_csrf_token;

    // Validate required fields
    if (!idToken) {
      return res.redirect(`${FRONTEND_URL}/oauth/callback?oauth=error&message=missing_token`);
    }

    // Verify CSRF token to prevent cross-site request forgery
    if (!g_csrf_token || g_csrf_token !== csrfCookie) {
      return res.redirect(`${FRONTEND_URL}/oauth/callback?oauth=error&message=csrf_invalid`);
    }

    // Verify the ID token with Google
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: idToken as string,
      audience: process.env.GOOGLE_WEB_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();

    // Verify payload exists
    if (!payload) {
      return res.redirect(`${FRONTEND_URL}/oauth/callback?oauth=error&message=invalid_token`);
    }

    // Extract user info from Google token
    const googleProfile = {
      email: payload.email || '', 
      fullName: payload.name || '',
    };

    logger.info('Google token verified', { email: googleProfile.email });

    // Find existing user or create new account
    const { accessToken, refreshToken} = await oauthService.findOrCreateOAuthUser(googleProfile);
    setRefreshTokenCookie(res, refreshToken);
    // Redirect to frontend OAuth callback page
    // Access token passed via URL (short-lived, acceptable for redirect)
    // Refresh token is in HttpOnly cookie
    return res.redirect(`${FRONTEND_URL}/oauth/callback?oauth=success&token=${accessToken}`);

  } catch (error) {

    // Determine error type for user-friendly message
    const errorMessage = error instanceof Error && error.message.includes('Token used too late')
      ? 'token_expired'
      : 'server_error';

    return res.redirect(`${FRONTEND_URL}/oauth/callback?oauth=error&message=${errorMessage}`);
  }
};