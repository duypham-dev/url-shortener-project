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

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const buildRefreshTokenKey = (userId: number): string => `refresh_token:${userId}`;
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

const toSafeUser = (user: AuthUserBase) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  role: user.role ?? "user",
});

// ================================================================
// OAUTH with Google (GoogleLogin)
// ================================================================
export interface OAuthInput {
  fullName: string;
  email: string;
}

export const findOrCreateOAuthUser = async (
  input: OAuthInput,
): Promise<AuthResult> => {
  const { email, fullName } = input;

  let user = await prisma.users.findUnique({
    where: { email },
    select: { id: true, full_name: true, email: true, role: true },
  });

  if (user) {
    const safeUser = toSafeUser(user);
    const payload: JwtPayload = {
      userId: safeUser.id,
      fullName: safeUser.full_name,
      email: safeUser.email,
      role: safeUser.role,
    };
    return issueTokens(payload, safeUser);
  }

  user = await prisma.users.create({
    data: {
      full_name: fullName,
      email,
      password_hash: generateSecureRandomPassword(),
      role: "user",
    },
    select: { id: true, full_name: true, email: true, role: true },
  });

  const safeUser = toSafeUser(user);
  
  const payload: JwtPayload = {
    userId: safeUser.id,
    fullName: safeUser.full_name,
    email: safeUser.email,
    role: safeUser.role,
  };
  return issueTokens(payload, safeUser);
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
    role: string;
  };
}

export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const { full_name, email, password } = input;

  const existingByEmail = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingByEmail) {
    throw new ConflictError("Email has already registered.");
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const newUser = await prisma.users.create({
    data: { full_name, email, password_hash },
    select: { id: true, full_name: true, email: true, role: true },
  });

  const safeUser = toSafeUser(newUser);
  const payload: JwtPayload = {
    userId: safeUser.id,
    fullName: safeUser.full_name,
    email: safeUser.email,
    role: safeUser.role,
  };

  return issueTokens(payload, safeUser);
};

// ================================================================
// LOGIN
// ================================================================
export interface LoginInput {
  email: string;
  password: string;
}

export const login = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password } = input;

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

  if (!user) {
    throw new UnauthorizedError("Email hoặc mật khẩu không đúng.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Email hoặc mật khẩu không đúng.");
  }

  const { password_hash: _, ...safeFields } = user;
  const safeUser = toSafeUser(safeFields);

  const payload: JwtPayload = {
    userId: safeUser.id,
    fullName: safeUser.full_name,
    email: safeUser.email,
    role: safeUser.role,
  };

  return issueTokens(payload, safeUser);
};

// ================================================================
// REFRESH TOKEN
// ================================================================
export const refreshTokens = async (
  incomingRefreshToken: string,
): Promise<Omit<AuthResult, "user">> => {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch (error) {
    throw error;
  }

  const storedToken = await redis.get(buildRefreshTokenKey(payload.userId));

  if (!storedToken || storedToken !== incomingRefreshToken) {
    await redis.del(buildRefreshTokenKey(payload.userId));
    throw new UnauthorizedError(
      "Refresh token is invalid or has been revoked. Please log in again.",
    );
  }

  const user = await prisma.users.findUnique({
    where: { id: payload.userId },
    select: { id: true, full_name: true, email: true, role: true },
  });
  if (!user) {
    throw new UnauthorizedError("User not found.");
  }

  const safeUser = toSafeUser(user);
  const newPayload: JwtPayload = {
    userId: safeUser.id,
    fullName: safeUser.full_name,
    email: safeUser.email,
    role: safeUser.role,
  };

  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

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
export const logout = async (
  userId: number,
  accessToken: string,
): Promise<void> => {
  await redis.del(buildRefreshTokenKey(userId));

  const remainingTTL = getTokenRemainingTTL(accessToken);
  if (remainingTTL > 0) {
    await redis.setex(buildBlacklistKey(accessToken), remainingTTL, "1");
  }
};

// ================================================================
// Helper: check if accessToken is blacklisted (after logout)
// ================================================================
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(buildBlacklistKey(token));
  return result !== null;
};

// ================================================================
// Private helper: create accessToken + refreshToken pair and store refreshToken in Redis
// ================================================================
async function issueTokens(
  payload: JwtPayload,
  user: { id: number; full_name: string; email: string; role: string },
): Promise<AuthResult> {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

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
      role: user.role,
    },
  };
}

// ================================================================
// FORGOT PASSWORD
// ================================================================
import { sendPasswordResetEmail } from "../utils/email.util";

export const forgotPassword = async (email: string, baseUrl: string): Promise<void> => {
  const user = await prisma.users.findUnique({ where: { email } });
  
  // Generic success message behavior: don't error out if user not found
  if (!user) {
    return;
  }

  const resetTokenStr = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetTokenStr).digest('hex');

  // Token valid for 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      reset_password_token: hashedToken,
      reset_password_expires: expiresAt,
    },
  });

  const resetUrl = `${baseUrl}/reset-password?token=${resetTokenStr}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (error) {
    // Clear token if email fails
    await prisma.users.update({
      where: { id: user.id },
      data: {
        reset_password_token: null,
        reset_password_expires: null,
      },
    });
    
    throw new Error('There was an error sending the password reset email. Please try again later.');
  }
};

// ================================================================
// RESET PASSWORD
// ================================================================
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.users.findFirst({
    where: {
      reset_password_token: hashedToken,
      reset_password_expires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Token is invalid or has expired.');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      reset_password_token: null,
      reset_password_expires: null,
    },
  });

  // Optional: Invalidate active sessions by deleting refresh token from Redis
  await redis.del(buildRefreshTokenKey(user.id));
}

