import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../utils/validate.util";

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
    const validation = validateRegisterInput(req.body);
    if (!validation.isValid) {
      res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ.",
        errors: validation.errors,
      });
      return;
    }

    // 2. Gọi service
    const { accessToken, refreshToken, user } = await authService.register({
      full_name: (req.body.fullName as string).trim(),
      email: (req.body.email as string).trim().toLowerCase(),
      password: req.body.password as string,
    });

    // 3. Set refreshToken vào httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);

    // 4. Trả về accessToken và thông tin user qua JSON
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công.",
      data: { accessToken, user },
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
    // 1. Validate input
    const validation = validateLoginInput(req.body);
    if (!validation.isValid) {
      res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ.",
        errors: validation.errors,
      });
      return;
    }

    // 2. Gọi service
    const { accessToken, refreshToken, user } = await authService.login({
      email: (req.body.email as string).trim().toLowerCase(),
      password: req.body.password as string,
    });

    // 3. Set refreshToken vào httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);

    // 4. Trả về accessToken
    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công.",
      data: { accessToken, user },
    });
  } catch (error) {
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
    res.cookie(REFRESH_TOKEN_COOKIE, newRefreshToken, COOKIE_OPTIONS);

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
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });

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
// Lấy thông tin user hiện tại từ token (không query DB)
// ================================================================
export const getMeHandler = (req: Request, res: Response): void => {
  // req.user đã được verifyToken middleware gắn vào
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};