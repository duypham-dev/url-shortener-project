/**
 * linkCache.service.ts
 *
 * Redis-backed short-link URL cache.
 *
 * Design intent:
 *   Cache is an optimisation, not a hard dependency. Both functions
 *   must NEVER throw to the caller — a Redis outage should degrade
 *   gracefully (cache miss → DB lookup) rather than breaking redirects.
 *
 * Phase 4 update:
 *   - Cached payload now includes `expiresAt` (ISO string or null).
 *   - TTL is set to min(1 hour, remaining seconds until link expiry) so
 *     expired links are auto-evicted from Redis at the right moment.
 */
import redis from '../libs/redis';
import { logger } from '../utils/logger';

const CACHE_KEY = (shortCode: string) => `link_short:${shortCode}`;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour default cap

interface CachedLinkPayload {
  longUrl: string;
  hasActiveQr: boolean;
  expiresAt: string | null; // ISO 8601 string or null
}

export async function getCachedLink(
  shortCode: string,
): Promise<{ longUrl: string; hasActiveQr: boolean; expiresAt: Date | null } | null> {
  try {
    const cached = await redis.get(CACHE_KEY(shortCode));
    if (!cached) return null;
    const parsed: CachedLinkPayload = JSON.parse(cached);
    return {
      longUrl: parsed.longUrl,
      hasActiveQr: parsed.hasActiveQr,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    };
  } catch (error) {
    // Redis is down or unreachable — fall back to DB lookup silently.
    logger.warn('Redis: getCachedLink failed — falling back to DB', { shortCode, error });
    return null;
  }
}

export async function cacheLink(
  shortCode: string,
  longUrl: string,
  hasActiveQr: boolean,
  expiresAt: Date | null,
): Promise<void> {
  try {
    let ttl = CACHE_TTL_SECONDS;

    if (expiresAt) {
      const secondsUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      if (secondsUntilExpiry <= 0) {
        // Already expired — don't cache at all
        return;
      }
      ttl = Math.min(ttl, secondsUntilExpiry);
    }

    const payload: CachedLinkPayload = {
      longUrl,
      hasActiveQr,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };

    await redis.set(CACHE_KEY(shortCode), JSON.stringify(payload), 'EX', ttl);
  } catch (error) {
    // Non-fatal: the redirect already succeeded. Log and move on.
    logger.warn('Redis: cacheLink failed — URL will not be cached', { shortCode, error });
  }
}

export async function invalidateCachedLink(shortCode: string): Promise<void> {
  try {
    await redis.del(CACHE_KEY(shortCode));
  } catch (error) {
    logger.warn('Redis: invalidateCachedLink failed — cache may be stale', { shortCode, error });
  }
}