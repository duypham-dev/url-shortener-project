/**
 * cookie.util.ts
 *
 * Refactor Notes:
 * - NEW FILE: Centralizes refresh token cookie configuration.
 *   Previously duplicated identically in auth.controller.ts and googleLogin.controller.ts.
 *   Single source of truth prevents silent divergence.
 */
import type { Response } from "express";

export const REFRESH_TOKEN_COOKIE = "refreshToken";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // HTTPS only trong prod
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày (milliseconds)
  path: "/",
};

/**
 * Helper: set refresh token cookie on the response.
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, token, COOKIE_OPTIONS);
};

/**
 * Helper: clear refresh token cookie from the response.
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
};
