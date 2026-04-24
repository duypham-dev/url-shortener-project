import type { Request, Response, NextFunction } from "express";
import redis from "../libs/redis.js";
import getClientIp from "../utils/getClientIP.js";
import { TooManyRequestsError } from "../errors/app.error.js";
import { logger } from "../utils/logger.js";
 
const REDIRECT_RATE_LIMIT = 60; // max requests
const REDIRECT_RATE_WINDOW = 60; // seconds
 
export const redirectRateLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const ip = getClientIp(req);
  const key = `rate_limit:redirect:${ip}`;
 
  try {
    // INCR + EXPIRE NX in a pipeline — atomic on the Redis side.
    // EXPIRE NX: only sets TTL if the key does not already have one (prevents window reset).
    const results = await redis
      .multi()
      .incr(key)
      .expire(key, REDIRECT_RATE_WINDOW, "NX")
      .exec();
 
    // ioredis exec() returns [Error | null, unknown][] or null if EXEC is aborted
    if (!results) {
      // Transaction aborted (rare) — allow request to pass instead of blocking the user
      return next();
    }
 
    const [incrError, count] = results[0] as [Error | null, number];
    if (incrError) {
      // Redis error — degrade gracefully, do not block the user
      logger.warn("redirectRateLimit: INCR failed, skipping rate limit", {
        ip,
        error: incrError.message,
      });
      return next();
    }
 
    if (count >= REDIRECT_RATE_LIMIT) {
      logger.warn("Rate limit exceeded on redirect", { ip });
      return next(
        new TooManyRequestsError("Too Many Requests. Please try again later."),
      );
    }
  } catch (error) {
    // Redis unavailable — allow request to pass, do not block the user
    logger.warn(
      "redirectRateLimit: Redis unavailable, skipping rate limit",
      { error },
    );
  }
 
  next();
};