/**
 * verifyToken.middleware.ts
 * Middleware xác thực JWT accessToken.
 * - Đọc token từ Authorization header (Bearer scheme)
 * - Kiểm tra blacklist trong Redis
 * - Gắn payload vào req.user để các handler sau dùng
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { isTokenBlacklisted } from "../services/auth.service";
import type { JwtPayload } from "../utils/jwt.util";

// ----------------------------------------------------------------
// Expand Express Request interface to include user property 
// ----------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ----------------------------------------------------------------
// verifyToken: bắt buộc phải có token hợp lệ
// ----------------------------------------------------------------
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Lấy token từ header "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Không tìm thấy token xác thực.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "Token không hợp lệ." });
      return;
    }

    // 2. Kiểm tra token có trong blacklist không (đã logout)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      res.status(401).json({
        success: false,
        message: "Token đã bị thu hồi. Vui lòng đăng nhập lại.",
      });
      return;
    }

    // 3. Verify chữ ký và hạn sử dụng
    const payload = verifyAccessToken(token);

    // 4. Gắn payload vào request để các middleware/controller sau sử dụng
    req.user = payload;

    next();
  } catch (error) {
    // JWT expired hoặc signature không hợp lệ
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }
};

// ----------------------------------------------------------------
// requireRole: kiểm tra quyền truy cập theo role (dùng sau verifyToken)
// Ví dụ: router.get('/admin', verifyToken, requireRole('admin'), handler)
// ----------------------------------------------------------------
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này.",
      });
      return;
    }

    next();
  };
};