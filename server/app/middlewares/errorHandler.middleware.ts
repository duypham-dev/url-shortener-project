/**
 * Phân loại lỗi:
 * - App errors (AppError): dùng statusCode + code của lỗi nghiệp vụ
 * - Prisma errors: xử lý riêng cho các lỗi DB phổ biến
 * - JWT errors: 401
 * - Fallback: 500 Internal Server Error
 */
import type { Request, Response, NextFunction } from "express";
import { AppError, isAppError } from "../errors/app.error.js";

// ----------------------------------------------------------------
// Kiểu chuẩn cho error response
// ----------------------------------------------------------------
interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: unknown; // Detail 
}

// ----------------------------------------------------------------
// Prisma error codes
// ----------------------------------------------------------------
const PRISMA_ERROR_CODES: Record<string, { status: number; message: string }> =
  {
    P2002: { status: 409, message: "Data has already exists." },
    P2025: { status: 404, message: "Record not found." },
    P2003: { status: 400, message: "Foreign key constraint violation." },
  };

  // ----------------------------------------------------------------
// Global Error Handler
// ----------------------------------------------------------------
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  const errorResponse: ErrorResponse = { success: false, message: "Đã xảy ra lỗi." };

  // ---- 1. Custom application errors ----
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      ...errorResponse,
      message: err.message,
      code: err.code,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // ---- 2. JWT errors ----
  if (err instanceof Error) {
    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError" ||
      err.name === "NotBeforeError"
    ) {
      res.status(401).json({
        ...errorResponse,
        message: "Token is invalid or has expired.",
      });
      return;
    }

    // ---- 3. Prisma errors ----
    const prismaErr = err as Error & { code?: string };
    if (prismaErr.code && prismaErr.code.startsWith("P")) {
      const mapped = PRISMA_ERROR_CODES[prismaErr.code];
      if (mapped) {
        res.status(mapped.status).json({
          ...errorResponse,
          message: mapped.message,
        });
        return;
      }
    }
  }

  // ---- 4. Fallback: 500 Internal Server Error ----
  const isDev = process.env.NODE_ENV === "development";
  res.status(500).json({
    ...errorResponse,
    message: isDev && err instanceof Error ? err.message : "Lỗi máy chủ nội bộ.",
  });
};

// ----------------------------------------------------------------
// Not Found Handler - đặt trước errorHandler trong app.ts
// ----------------------------------------------------------------
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
  });
};