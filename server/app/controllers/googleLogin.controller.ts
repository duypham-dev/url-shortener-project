import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger';
import type {Request, Response} from "express";
import * as oauthService from '../services/auth.service';

const googleOAuthClient = new OAuth2Client({
  clientId: process.env.GOOGLE_WEB_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_WEB_SECRET as string,
});

/** Frontend URL for OAuth redirects */
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Cookie tên cho refreshToken
const REFRESH_TOKEN_COOKIE = "refreshToken";

// Options cho httpOnly cookie - tập trung tại đây để dễ maintain
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // HTTPS only trong prod
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày (milliseconds)
  path: "/",
};

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
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
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