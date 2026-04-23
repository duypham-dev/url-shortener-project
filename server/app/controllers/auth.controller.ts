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
// import {
//   validateRegisterInput,
//   validateLoginInput,
// } from "../utils/validate.util";
import {
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.util";

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
    // 1. Validate input
    // const validation = validateRegisterInput(req.body);
    // if (!validation.isValid) {
    //   res.status(422).json({
    //     success: false,
    //     message: "Dữ liệu không hợp lệ.",
    //     errors: validation.errors,
    //   });
    //   return;
    // }

    // 2. Gọi service
    const { accessToken, refreshToken, user } = await authService.register({
      full_name: (req.body.fullName as string).trim(),
      email: (req.body.email as string).trim().toLowerCase(),
      password: req.body.password as string,
    });

    // 3. Set refreshToken vào httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // 4. Trả về accessToken và thông tin user qua JSON
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công.",
      data: { accessToken, user: toAuthUserDto(user) },
    });
  } catch (error) {
    next(error); // Chuyển lỗi sang errorHandler middleware
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
    console.log("LOGIN HANDLER CALLED WITH BODY:", req.body);
    const { accessToken, refreshToken, user } = await authService.login({
      email: (req.body.email as string).trim().toLowerCase(),
      password: req.body.password as string,
    });

    // 3. Set refreshToken vào httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // 4. Trả về accessToken
    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công.",
      data: { accessToken, user: toAuthUserDto(user) },
    });
  } catch (error) {
    console.error("Error in loginHandler:", error);
    next(error);
  }
};

// ================================================================
// POST /api/v1/auth/refresh
// Lấy accessToken mới bằng refreshToken trong cookie
// ================================================================
export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Lấy refreshToken từ httpOnly cookie (không lấy từ body để bảo mật)
    const incomingRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (!incomingRefreshToken) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy refresh token.",
      });
      return;
    }

    // 2. Gọi service - sẽ rotate token (phát hành cặp mới, invalidate cũ)
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokens(incomingRefreshToken);
    // 3. Cập nhật cookie với refreshToken mới
    setRefreshTokenCookie(res, newRefreshToken);

    // 4. Trả về accessToken mới
    res.status(200).json({
      success: true,
      message: "Làm mới token thành công.",
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// POST /api/v1/auth/logout  [Protected - cần verifyToken]
// ================================================================
export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.user được gắn bởi verifyToken middleware
    const userId = req.user!.userId;

    // Lấy raw token để blacklist
    const accessToken = req.headers.authorization!.split(" ")[1]!;

    // Gọi service: xóa refreshToken khỏi Redis + blacklist accessToken
    await authService.logout(userId, accessToken);

    // Xóa cookie
    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công.",
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