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
import { ForbiddenError, UnauthorizedError } from "../errors/app.error.js";
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
// verifyToken: Main middleware to verify JWT access token
// - Returns 401 if token is missing, invalid, expired, or blacklisted
// - On success, attaches payload to req.user and calls next()
// ----------------------------------------------------------------
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authorization header missing or malformed.");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Token missing.");
    }

    // 2. Check if token is blacklisted (after logout)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw new UnauthorizedError("Token has been revoked!");
    }

    const payload = verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError("Invalid or expired token."));
    }
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Unauthorized.");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError("Forbidden: You don't have permission to access this resource.");
      }

      next();
    } catch (error) {
      next(error); 
    }
  };
};
