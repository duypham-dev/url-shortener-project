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
import { NotFoundError } from "../errors/app.error.js";

// TTL for unique-click set: reset after 24 hours
const UNIQUE_CLICK_TTL = 86400;

const buildClickMessage = (
  req: Request,
  shortCode: string,
  longUrl: string,
  ip: string,
  interactionType: 'CLICK' | 'SCAN',
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

  // Detect whether this hit came from a QR code scan:
  //   - QR images encode {shortUrl}?r=qr
  //   - When scanned, Express parses r=qr into req.query
  const interactionType: 'CLICK' | 'SCAN' =
    req.query.r === 'qr' ? 'SCAN' : 'CLICK';

  logger.info("Redirect requested", { shortCode, interactionType });

  try {
    const ip = getClientIp(req);
    const isUnique = await trackUniqueClick(shortCode, ip);

    // Check Redis cache first — avoids DB query on hot paths
    const cachedUrl = await getCachedLink(shortCode);
    if (cachedUrl) {
      logger.info("Cache hit", { shortCode });
      if (isUnique) {
        void publishClickEvent(
          buildClickMessage(req, shortCode, cachedUrl, ip, interactionType),
        );
      }
      return res.redirect(cachedUrl);
    }

    logger.info("Cache miss — querying database", { shortCode });

    const longUrl = await getLongUrlByShortCode(shortCode);
    if (!longUrl) {
      throw new NotFoundError("URL not found");
    }

    // Populate cache for subsequent requests (fire-and-forget)
    void cacheLink(shortCode, longUrl);

    if (isUnique) {
      void publishClickEvent(
        buildClickMessage(req, shortCode, longUrl, ip, interactionType),
      );
    }

    return res.redirect(longUrl);
  } catch (error) {
    next(error);
  }
};

export default redirectLink;