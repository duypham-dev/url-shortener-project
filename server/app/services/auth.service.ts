/**
 * auth.service.ts
 * Chứa toàn bộ business logic của Authentication.
 * Tuân thủ Single Responsibility Principle - chỉ xử lý logic, không biết về HTTP.
 */
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../libs/prisma";
import redis from "../libs/redis";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getTokenRemainingTTL,
  type JwtPayload,
} from "../utils/jwt.util";
import {
  ConflictError,
  UnauthorizedError,
} from "../errors/app.error.js";
import { isVipUser } from "./subscriptionAccess.service.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const BCRYPT_SALT_ROUNDS = 12; // Cost factor: 12 là chuẩn bảo mật tốt
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

// ----------------------------------------------------------------
// Helper: tạo Redis key lưu refreshToken của user
// ----------------------------------------------------------------
const buildRefreshTokenKey = (userId: number): string => `refresh_token:${userId}`;

// ----------------------------------------------------------------
// Helper: tạo Redis key cho blacklist accessToken
// ----------------------------------------------------------------
const buildBlacklistKey = (token: string): string => `blacklist:${token}`;

function generateSecureRandomPassword() {
  return crypto.randomBytes(32).toString("hex");
}

interface AuthUserBase {
  id: number;
  full_name: string;
  email: string;
  role: string | null;
}

const enrichUserWithVip = async (user: AuthUserBase) => {
  const vipStatus = await isVipUser(user.id);
  return {
    ...user,
    role: user.role ?? "user",
    is_vip: vipStatus,
  };
};

// ================================================================
//OAUTH with Google (GoogleLogin)
// ================================================================
export interface OAuthInput {
  fullName: string;
  email: string;
}

export const findOrCreateOAuthUser = async (
  input: OAuthInput,
): Promise<AuthResult> => {
  const { email, fullName } = input;

  // Try to find existing user by email
  let user = await prisma.users.findUnique({
    where: { email },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
    },
  });

  if (user) {
    const hydratedUser = await enrichUserWithVip(user);
    const payload: JwtPayload = {
      userId: hydratedUser.id,
      fullName: hydratedUser.full_name,
      email,
      is_vip: hydratedUser.is_vip,
      role: hydratedUser.role,
    };

    return issueTokens(payload, hydratedUser);
  }

  // Create new user with OAuth data
  // Password is randomly generated (OAuth users don't use password login)
  user = await prisma.users.create({
    data: {
      full_name: fullName,
      email: email,
      password_hash: generateSecureRandomPassword(),
      role: "user",
    },
    select: { id: true, full_name: true, email: true, password_hash: true, role: true },
  });

  const hydratedUser = await enrichUserWithVip(user);

  const payload: JwtPayload = {
    userId: hydratedUser.id,
    fullName: hydratedUser.full_name,
    email: hydratedUser.email,
    is_vip: hydratedUser.is_vip,
    role: hydratedUser.role,
  };

  return issueTokens(payload, hydratedUser);
};

// ================================================================
// REGISTER
// ================================================================
export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    is_vip: boolean;
    role: string;
  };
}

/**
 * Đăng ký user mới.
 * - Kiểm tra email/username đã tồn tại chưa
 * - Hash password với bcrypt
 * - Tạo user trong DB
 * - Phát hành token ngay sau khi đăng ký
 */
export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const { full_name, email, password } = input;

  // 1. Kiểm tra email đã tồn tại chưa
  const existingByEmail = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingByEmail) {
    throw new ConflictError("Email đã được sử dụng.");
  }

  // 3. Hash password (bcrypt tự thêm salt)
  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // 4. Tạo user trong database
  const newUser = await prisma.users.create({
    data: { full_name, email, password_hash },
    select: { id: true, full_name: true, email: true, role: true },
  });

  const hydratedUser = await enrichUserWithVip(newUser);

  // 5. Phát hành tokens
  const payload: JwtPayload = {
    userId: hydratedUser.id,
    fullName: hydratedUser.full_name,
    email: hydratedUser.email,
    is_vip: hydratedUser.is_vip,
    role: hydratedUser.role,
  };

  return issueTokens(payload, hydratedUser);
};

// ================================================================
// LOGIN
// ================================================================
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Đăng nhập.
 * - Tìm user theo email
 * - So sánh password với bcrypt (constant-time compare để chống timing attack)
 * - Phát hành token mới (revoke token cũ trong Redis)
 */
export const login = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password } = input;

  // 1. Tìm user, lấy thêm password_hash để verify
  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      password_hash: true,
    },
  });

  // Không tìm thấy user - trả về cùng lỗi với sai password để tránh user enumeration
  if (!user) {
    throw new UnauthorizedError("Email hoặc mật khẩu không đúng.");
  }

  // 2. Verify password (bcrypt.compare là constant-time)
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Email hoặc mật khẩu không đúng.");
  }

  // 3. Phát hành tokens
  const { password_hash: _, ...safeUser } = user;
  const hydratedUser = await enrichUserWithVip(safeUser);

  const payload: JwtPayload = {
    userId: hydratedUser.id,
    fullName: hydratedUser.full_name,
    email: hydratedUser.email,
    is_vip: hydratedUser.is_vip,
    role: hydratedUser.role,
  };

  return issueTokens(payload, hydratedUser);
};

// ================================================================
// REFRESH TOKEN
// ================================================================
/**
 * Làm mới accessToken bằng refreshToken.
 * - Verify chữ ký JWT của refreshToken
 * - Kiểm tra refreshToken có khớp với bản lưu trong Redis không (Refresh Token Rotation)
 * - Phát hành cặp token mới (Invalidate token cũ)
 */
export const refreshTokens = async (
  incomingRefreshToken: string,
): Promise<Omit<AuthResult, "user">> => {
  console.log("Refresh new token!");
  // 1. Verify chữ ký và hạn sử dụng
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch (error) {
    console.error("Error occurred while verifying refresh token:", error);
    throw new UnauthorizedError("Refresh token không hợp lệ hoặc đã hết hạn.");
  }

  // 2. Kiểm tra trong Redis - Token Rotation: mỗi refreshToken chỉ dùng 1 lần
  const storedToken = await redis.get(buildRefreshTokenKey(payload.userId));

  if (!storedToken || storedToken !== incomingRefreshToken) {
    // Có thể là token replay attack - xóa token để force logout
    await redis.del(buildRefreshTokenKey(payload.userId));
    throw new UnauthorizedError(
      "Refresh token đã bị thu hồi hoặc không hợp lệ.",
    );
  }

  // 3. Lấy user hiện tại để cập nhật role (đề phòng role thay đổi)
  const user = await prisma.users.findUnique({
    where: { id: payload.userId },
    select: { id: true, full_name: true, email: true, role: true },
  });
  if (!user) {
    throw new UnauthorizedError("Tài khoản không tồn tại.");
  }

  const hydratedUser = await enrichUserWithVip(user);

  // 4. Tạo cặp token mới
  const newPayload: JwtPayload = {
    userId: hydratedUser.id,
    fullName: hydratedUser.full_name,
    email: hydratedUser.email,
    is_vip: hydratedUser.is_vip,
    role: hydratedUser.role,
  };

  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  // 5. Lưu refreshToken mới vào Redis (ghi đè token cũ)
  await redis.setex(
    buildRefreshTokenKey(user.id),
    REFRESH_TOKEN_TTL_SECONDS,
    newRefreshToken,
  );

  return { accessToken, refreshToken: newRefreshToken };
};

// ================================================================
// LOGOUT
// ================================================================
/**
 * Đăng xuất.
 * - Xóa refreshToken khỏi Redis
 * - Blacklist accessToken (cho đến khi nó tự hết hạn)
 */
export const logout = async (
  userId: number,
  accessToken: string,
): Promise<void> => {
  // Xóa refreshToken - user không thể refresh nữa
  await redis.del(buildRefreshTokenKey(userId));

  // Blacklist accessToken - vô hiệu hóa ngay lập tức
  // TTL = thời gian còn lại của token để tránh lãng phí bộ nhớ Redis
  const remainingTTL = getTokenRemainingTTL(accessToken);
  if (remainingTTL > 0) {
    await redis.setex(buildBlacklistKey(accessToken), remainingTTL, "1");
  }
};

// ================================================================
// Helper: check accessToken có bị blacklist không (dùng bởi middleware)
// ================================================================
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(buildBlacklistKey(token));
  return result !== null;
};

// ================================================================
// Private helper: phát hành tokens và lưu refreshToken vào Redis
// ================================================================
async function issueTokens(
  payload: JwtPayload,
  user: { id: number; full_name: string; email: string; is_vip: boolean; role: string },
): Promise<AuthResult> {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Lưu refreshToken vào Redis với TTL 7 ngày
  await redis.setex(
    buildRefreshTokenKey(payload.userId),
    REFRESH_TOKEN_TTL_SECONDS,
    refreshToken,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      is_vip: user.is_vip,
      role: user.role ?? "user",
    },
  };
}
