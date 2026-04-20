/**
 * linkCache.service.ts
 *
 * Redis-backed short-link URL cache.
 *
 * Design intent:
 *   Cache is an optimisation, not a hard dependency. Both functions
 *   must NEVER throw to the caller — a Redis outage should degrade
 *   gracefully (cache miss → DB lookup) rather than breaking redirects.
 */
import redis from '../libs/redis';
import { logger } from '../utils/logger';

const CACHE_KEY = (shortCode: string) => `link_short:${shortCode}`;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export async function getCachedLink(shortCode: string): Promise<string | null> {
  try {
    return await redis.get(CACHE_KEY(shortCode));
  } catch (error) {
    // Redis is down or unreachable — fall back to DB lookup silently.
    logger.warn('Redis: getCachedLink failed — falling back to DB', { shortCode, error });
    return null;
  }
}

export async function cacheLink(shortCode: string, longUrl: string): Promise<void> {
  try {
    await redis.set(CACHE_KEY(shortCode), longUrl, 'EX', CACHE_TTL_SECONDS);
  } catch (error) {
    // Non-fatal: the redirect already succeeded. Log and move on.
    logger.warn('Redis: cacheLink failed — URL will not be cached', { shortCode, error });
  }
}