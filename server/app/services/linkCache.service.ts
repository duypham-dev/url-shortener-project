import redis from "../libs/redis.js";

export async function cacheLink(shortCode: string, longUrl: string) {
  try {
    await redis.set(`link_short:${shortCode}`, longUrl, 'EX', 60 * 60); // Cache for 1 hour
  } catch (error) {
    console.error('Error caching link:', error);
    throw new Error('Failed to cache link');
  }
}

export async function getCachedLink(shortCode: string): Promise<string | null> {
  try {
    const cachedUrl = await redis.get(`link_short:${shortCode}`);
    return cachedUrl;
  } catch (error) {
    console.error('Error retrieving cached link:', error);
    throw new Error('Failed to retrieve cached link');
  }
}