/**
 * redirecLink.controller.ts
 *
 * Refactor Notes:
 * - Phase 5: Replaced direct prisma/Kafka calls with service layer.
 * - Phase 4: Errors forwarded via next(error) to global errorHandler.
 * - Phase 6: Removed debug console.log statements.
 * - Phase 7: Added referrer to click event message; removed debug console.log.
 * - Phase 8: Added CLICK vs SCAN detection via ?r=qr query parameter.
 *   When a QR code is scanned, the embedded URL includes ?r=qr. The redirect
 *   controller inspects this parameter to log the correct InteractionType.
 * - Project Phase 4: Added link-expiration enforcement — returns 410 Gone for
 *   expired links and skips caching already-expired entries.
 */
import { logger } from "../utils/logger.js";
import type { Request, Response, NextFunction } from "express";
import { getCachedLink, cacheLink } from "../services/linkCache.service.js";
import {
  getLongUrlByShortCode,
  publishClickEvent,
} from "../services/link.service.js";
import type { ClickTrackInput } from "../services/link.service.js";
import redis from "../libs/redis.js";
import getClientIp from "../utils/getClientIP.js";
import { AppError, NotFoundError } from "../errors/app.error.js";

// TTL for unique-click set: reset after 24 hours
const UNIQUE_CLICK_TTL = 86400;

const buildClickMessage = (
  req: Request,
  shortCode: string,
  longUrl: string,
  ip: string,
  interactionType: "CLICK" | "SCAN",
): ClickTrackInput => ({
  shortCode,
  longUrl,
  ip,
  userAgent: req.get("User-Agent") ?? "",
  referrer: req.get("Referer") ?? "Direct",
  timestamp: new Date().toISOString(),
  interactionType,
});

/**
 * Checks whether this IP has already interacted with this short code in the
 * last 24 hours. Returns true only for the first interaction (unique click/scan).
 * Degrades gracefully if Redis is unavailable.
 */
const trackUniqueClick = async (
  shortCode: string,
  ip: string,
): Promise<boolean> => {
  const key = `unique_clicks:${shortCode}`;
  try {
    const results = await redis
      .multi()
      .sadd(key, ip)
      .expire(key, UNIQUE_CLICK_TTL, "NX")
      .exec();

    if (!results) return false;

    const [saddError, addedCount] = results[0] as [Error | null, number];
    if (saddError) {
      logger.warn("trackUniqueClick: SADD failed", {
        shortCode,
        error: saddError.message,
      });
      return false;
    }

    // SADD returns 1 if the element was newly added (IP not seen before)
    return addedCount === 1;
  } catch (error) {
    logger.warn("trackUniqueClick: Redis unavailable", { error });
    return false;
  }
};

const redirectLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { shortCode } = req.params as { shortCode: string };
  const requestedScan = req.query.r === "qr";

  logger.info("Redirect requested", { shortCode, requestedScan });

  try {
    const ip = getClientIp(req);
    const isUnique = await trackUniqueClick(shortCode, ip);

    // Check Redis cache first — avoids DB query on hot paths
    let cachedData = await getCachedLink(shortCode);

    if (!cachedData) {
      logger.info("Cache miss — querying database", { shortCode });

      const mapping = await getLongUrlByShortCode(shortCode);

      if (!mapping) throw new NotFoundError("URL not found");

      // ── Phase 4: expiry check (DB path) ──────────────────────────────────
      if (mapping.expiresAt && mapping.expiresAt < new Date()) {
        throw new AppError(410, "LINK_EXPIRED", "This link has expired.");
      }

      cachedData = {
        longUrl: mapping.longUrl,
        hasActiveQr: mapping.hasActiveQr,
        expiresAt: mapping.expiresAt,
      };

      // Pass expiresAt so cacheLink can compute the correct TTL
      void cacheLink(shortCode, cachedData.longUrl, cachedData.hasActiveQr, cachedData.expiresAt);
    } else {
      logger.info("Cache hit", { shortCode });

      // ── Phase 4: expiry check (cache path) ───────────────────────────────
      if (cachedData.expiresAt && cachedData.expiresAt < new Date()) {
        throw new AppError(410, "LINK_EXPIRED", "This link has expired.");
      }
    }

    const interactionType: "CLICK" | "SCAN" =
      requestedScan && cachedData.hasActiveQr ? "SCAN" : "CLICK";

    if (isUnique) {
      void publishClickEvent(
        buildClickMessage(
          req,
          shortCode,
          cachedData.longUrl,
          ip,
          interactionType,
        ),
      );
    }

    return res.redirect(cachedData.longUrl);
  } catch (error) {
    next(error);
  }
};

export default redirectLink;
