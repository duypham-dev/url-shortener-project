/**
 * auth.controller.ts
 *
 * Refactor Notes:
 * - Phase 7: Replaced duplicated REFRESH_TOKEN_COOKIE / COOKIE_OPTIONS with
 *   imports from shared cookie.util.ts.
 * - Phase 2 (Option A): getMeHandler remains JWT-only for fast response.
 *   Updated comment to clarify the design tradeoff: speed over freshness.
 *   Frontend uses /subscriptions/me/plan when authoritative subscription data is needed.
 */
import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import {
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.util";
import { UnauthorizedError } from "../errors/app.error";

const toAuthUserDto = (user: {
  id: number;
  full_name: string;
  email: string;
  role: string;
}) => ({
  userId: user.id,
  fullName: user.full_name,
  email: user.email,
  role: user.role,
});

// ================================================================
// POST /api/v1/auth/register
// ================================================================
export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { accessToken, refreshToken, user } = await authService.register({
      full_name: (req.body.fullName as string).trim(),
      email: (req.body.email as string).trim().toLowerCase(),
      password: req.body.password as string,
    });

    // Set refreshToken into httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // Return accessToken and user info
    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: { accessToken, user: toAuthUserDto(user) },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// POST /api/v1/auth/login
// ================================================================
export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { accessToken, refreshToken, user } = await authService.login({
      email: (req.body.email as string).trim().toLowerCase(),
      password: req.body.password as string,
    });

    //Set refreshToken into httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    //Return accessToken and user info
    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: { accessToken, user: toAuthUserDto(user) },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// POST /api/v1/auth/refresh
// ================================================================
export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    //Get refreshToken from cookie
    const incomingRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (!incomingRefreshToken) {
      throw new UnauthorizedError("Refresh token is required.");
    }

    // Call refreshTokens Service - it will verify the incoming refresh token, issue new tokens, and handle blacklisting of old tokens if necessary
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(incomingRefreshToken);
    // 3. Cập nhật cookie với refreshToken mới
    setRefreshTokenCookie(res, newRefreshToken);

    // 4. Trả về accessToken mới
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// POST /api/v1/auth/logout
// ================================================================
export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Lấy raw token để blacklist
    const accessToken = req.headers.authorization!.split(" ")[1]!;

    // Gọi service: xóa refreshToken khỏi Redis + blacklist accessToken
    await authService.logout(userId, accessToken);

    // Xóa cookie
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/v1/auth/me  [Protected - cần verifyToken]
// Returns the JWT payload directly — no DB query.
// Design tradeoff (Option A): speed over freshness.
// isVip/role may be up to 15 min stale (until next token refresh).
// For authoritative subscription data, frontend uses /subscriptions/me/plan.
// ================================================================
export const getMeHandler = (req: Request, res: Response): void => {
  // req.user đã được verifyToken middleware gắn vào
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};