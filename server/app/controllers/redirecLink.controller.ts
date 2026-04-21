/**
 * redirecLink.controller.ts
 *
 * Refactor Notes:
 * - Phase 5: Replaced direct prisma/Kafka calls with service layer.
 * - Phase 4: Errors forwarded via next(error) to global errorHandler.
 * - Phase 6: Removed debug console.log statements.
 * - Phase 7: Added referrer to click event message; removed debug console.log.
 */
import { logger } from '../utils/logger';
import type { Request, Response, NextFunction } from 'express';
import { getCachedLink, cacheLink } from '../services/linkCache.service';
import { getLongUrlByShortCode, publishClickEvent } from '../services/link.service.js';
import type { ClickEventMessage } from '../services/link.service.js';
import redis from '../libs/redis.js';

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (ipStr?.split(',')[0].trim()) || req.ip || req.socket.remoteAddress || 'unknown';
};

const buildClickMessage = (req: Request, shortCode: string, longUrl: string, ip: string): ClickEventMessage => ({
  shortCode,
  longUrl,
  ip,
  userAgent: req.get('User-Agent') ?? '',
  referrer: req.get('Referrer') ?? 'Direct',
  timestamp: new Date().toISOString(),
});

const redirectLink = async (req: Request, res: Response, next: NextFunction) => {
  const { shortCode } = req.params as { shortCode: string };
  logger.info('Redirect requested', { shortCode });

  try {
    const ip = getClientIp(req);
    console.log(`Redirect request for ${shortCode} from IP: ${ip}`); // Debug log for incoming requests
    // 1. Rate Limiting: Max 60 requests per minute per IP to prevent spam
    const rateLimitKey = `rate_limit:redirect:${ip}`;
    const currentCount = await redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await redis.expire(rateLimitKey, 60); // Expire in 60 seconds
    }
    if (currentCount > 60) {
      logger.warn('Rate limit exceeded', { ip, shortCode });
      return res.status(429).send('Too Many Requests. Please try again later.');
    }

    // 2. Track unique IP (if `isUnique === 1`, it's a new unique IP for this shortCode)
    const uniqueIpKey = `unique_clicks:${shortCode}`;
    const isUnique = await redis.sadd(uniqueIpKey, ip);

    // Check Redis cache first — avoids DB query on hot paths
    const cachedUrl = await getCachedLink(shortCode);
    if (cachedUrl) {
      logger.info('Cache hit', { shortCode });
      if (isUnique === 1) {
        publishClickEvent(buildClickMessage(req, shortCode, cachedUrl, ip));
      }
      return res.redirect(cachedUrl);
    }

    logger.info('Cache miss — querying database', { shortCode });

    const longUrl = await getLongUrlByShortCode(shortCode);
    if (!longUrl) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Populate cache for subsequent requests (fire-and-forget)
    cacheLink(shortCode, longUrl);

    if (isUnique === 1) {
      publishClickEvent(buildClickMessage(req, shortCode, longUrl, ip));
    }

    return res.redirect(longUrl);
  } catch (error) {
    next(error);
  }
};

export default redirectLink;