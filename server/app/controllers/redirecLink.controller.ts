/**
 * redirecLink.controller.ts
 *
 * Refactor Notes:
 * - Phase 5: Replaced direct prisma.url_mappings.findUnique() and Kafka
 *   producer.send() with service layer calls (getLongUrlByShortCode,
 *   publishClickEvent from link.service.ts). Controller no longer imports
 *   Prisma or Kafka directly.
 * - Phase 4: Replaced inline catch → res.status(500) with next(error)
 *   so all errors flow through the global errorHandler middleware.
 * - Phase 6: Removed debug console.log("Cached URL:", cachedUrl).
 */
import { logger } from '../utils/logger';
import type { Request, Response, NextFunction } from "express";
import { getCachedLink, cacheLink } from '../services/linkCache.service';
import { getLongUrlByShortCode, publishClickEvent } from '../services/link.service.js';
import type { ClickEventMessage } from '../services/link.service.js';

const buildClickMessage = (req: Request, shortCode: string, longUrl: string): ClickEventMessage => ({
  shortCode,
  longUrl,
  ip: req.ip as string,
  userAgent: req.get('User-Agent') as string,
  timestamp: new Date().toISOString(),
});

const redirectLink = async (req: Request, res: Response, next: NextFunction) => {
  const { shortCode } = req.params as { shortCode: string };
  logger.info('Received short code for redirection', { shortCode });

  try {
    // Check cache first before querying the database
    const cachedUrl = await getCachedLink(shortCode);
    if (cachedUrl) {
      await publishClickEvent(buildClickMessage(req, shortCode, cachedUrl));
      logger.info('Cache hit for short code', { shortCode });
      return res.redirect(cachedUrl);
    }

    logger.info('Cache miss for short code, querying database', { shortCode });

    // Fetch from DB via service layer (only selects long_url)
    const longUrl = await getLongUrlByShortCode(shortCode);

    if (!longUrl) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Cache the result for future requests
    await cacheLink(shortCode, longUrl);

    await publishClickEvent(buildClickMessage(req, shortCode, longUrl));

    res.redirect(longUrl);
  } catch (error) {
    next(error);
  }
};

export default redirectLink;