/**
 * jwt.util.ts
 * Các helper function để tạo và xác minh JWT.
 * - accessToken: sống ngắn (15 phút), trả về qua JSON body
 * - refreshToken: sống dài (7 ngày), lưu vào httpOnly Cookie và Redis
 */
import jwt from "jsonwebtoken";

// ----------------------------------------------------------------
// Kiểu dữ liệu của payload bên trong token
// ----------------------------------------------------------------
export interface JwtPayload {
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

// ----------------------------------------------------------------
// Đọc secret từ biến môi trường, throw nếu chưa cấu hình
// ----------------------------------------------------------------
const getSecret = (key: string): string => {
  const secret = process.env[key];
  if (!secret) throw new Error(`Environment variable ${key} is not defined`);
  return secret;
};

// ----------------------------------------------------------------
// Tạo accessToken (short-lived: 15 phút)
// ----------------------------------------------------------------
export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getSecret("JWT_ACCESS_SECRET"), {
    expiresIn: "15m",
    algorithm: "HS256",
  });
};

// ----------------------------------------------------------------
// Tạo refreshToken (long-lived: 7 ngày)
// ----------------------------------------------------------------
export const signRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getSecret("JWT_REFRESH_SECRET"), {
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

// ----------------------------------------------------------------
// Xác minh accessToken, throw nếu không hợp lệ
// ----------------------------------------------------------------
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret("JWT_ACCESS_SECRET")) as JwtPayload;
};

// ----------------------------------------------------------------
// Xác minh refreshToken, throw nếu không hợp lệ
// ----------------------------------------------------------------
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret("JWT_REFRESH_SECRET")) as JwtPayload;
};

// ----------------------------------------------------------------
// Decode token KHÔNG xác minh chữ ký (dùng cho blacklist check)
// ----------------------------------------------------------------
export const decodeToken = (token: string): JwtPayload | null => {
  const decoded = jwt.decode(token);
  return decoded ? (decoded as JwtPayload) : null;
};

// ----------------------------------------------------------------
// Tính TTL còn lại (giây) của token để set TTL Redis đúng
// ----------------------------------------------------------------
export const getTokenRemainingTTL = (token: string): number => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return 0;
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
};