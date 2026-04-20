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

const buildClickMessage = (req: Request, shortCode: string, longUrl: string): ClickEventMessage => ({
  shortCode,
  longUrl,
  ip: req.ip as string,
  userAgent: req.get('User-Agent') ?? '',
  referrer: req.get('Referrer') ?? null,
  timestamp: new Date().toISOString(),
});

const redirectLink = async (req: Request, res: Response, next: NextFunction) => {
  const { shortCode } = req.params as { shortCode: string };
  logger.info('Redirect requested', { shortCode });

  try {
    // Check Redis cache first — avoids DB query on hot paths
    const cachedUrl = await getCachedLink(shortCode);
    if (cachedUrl) {
      logger.info('Cache hit', { shortCode });
      // Fire-and-forget: do not await so redirect is not delayed by Kafka
      publishClickEvent(buildClickMessage(req, shortCode, cachedUrl));
      return res.redirect(cachedUrl);
    }

    logger.info('Cache miss — querying database', { shortCode });

    const longUrl = await getLongUrlByShortCode(shortCode);
    if (!longUrl) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Populate cache for subsequent requests (fire-and-forget)
    cacheLink(shortCode, longUrl);

    // Publish click event to Kafka (fire-and-forget)
    publishClickEvent(buildClickMessage(req, shortCode, longUrl));

    return res.redirect(longUrl);
  } catch (error) {
    next(error);
  }
};

export default redirectLink;