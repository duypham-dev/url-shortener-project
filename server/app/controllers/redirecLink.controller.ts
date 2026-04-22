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
import type { ClickTrackInput } from '../services/link.service.js';
import redis from '../libs/redis.js';
import  getClientIp from '../utils/getClientIP.js';


const buildClickMessage = (req: Request, shortCode: string, longUrl: string, ip: string): ClickTrackInput => ({
  shortCode,
  longUrl,
  ip,
  userAgent: req.get('User-Agent') ?? '',
  referrer: req.get('Referer') ?? 'Direct',
  timestamp: new Date().toISOString(),
});

const redirectLink = async (req: Request, res: Response, next: NextFunction) => {
  const { shortCode } = req.params as { shortCode: string };
  logger.info('Redirect requested', { shortCode });

  try {
    const ip = getClientIp(req);

    // 1. Rate Limiting: Max 60 requests per minute per IP to prevent spam
    const rateLimitKey = `rate_limit:redirect:${ip}`;
    const rateLimitResult = await redis.multi().incr(rateLimitKey).expire(rateLimitKey, 60, 'NX').exec();
    const currentCount = rateLimitResult ? (rateLimitResult[0]?.[1] as number) : 0;
    
    if (currentCount > 60) {
      logger.warn('Rate limit exceeded', { ip, shortCode });
      return res.status(429).send('Too Many Requests. Please try again later.');
    }

    // 2. Track unique IP (if `isUnique === 1`, it's a new unique IP for this shortCode)
    const uniqueIpKey = `unique_clicks:${shortCode}`;
    const uniqueResult = await redis.multi().sadd(uniqueIpKey, ip).expire(uniqueIpKey, 86400, 'NX').exec();
    const isUnique = uniqueResult ? (uniqueResult[0]?.[1] as number) : 0;

    // Check Redis cache first — avoids DB query on hot paths
    const cachedUrl = await getCachedLink(shortCode);
    if (cachedUrl) {
      logger.info('Cache hit', { shortCode });
      if (isUnique === 1) {
        void publishClickEvent(buildClickMessage(req, shortCode, cachedUrl, ip));
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
      void publishClickEvent(buildClickMessage(req, shortCode, longUrl, ip));
    }

    return res.redirect(longUrl);
  } catch (error) {
    next(error);
  }
};

export default redirectLink;