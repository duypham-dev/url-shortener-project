import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

export const CLICK_EVENTS_QUEUE = 'click-events';

// BullMQ requires its own ioredis instance — do NOT share with the
// main Redis client used for caching (BullMQ sets maxRetriesPerRequest: null).
const bullConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
});

export const clickQueue = new Queue(CLICK_EVENTS_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const initQueue = async (): Promise<void> => {
  try {
    // Verify and configure maxmemory-policy to prevent eviction of BullMQ queue keys
    const policyResult = (await bullConnection.config('GET', 'maxmemory-policy')) as string[];
    const currentPolicy = policyResult && policyResult[1];

    if (currentPolicy !== 'noeviction') {
      logger.warn(`Redis maxmemory-policy is currently set to "${currentPolicy}". Attempting to set to "noeviction"...`);
      await bullConnection.config('SET', 'maxmemory-policy', 'noeviction');
      logger.info('Redis maxmemory-policy successfully updated to "noeviction".');
    } else {
      logger.info('Redis maxmemory-policy is verified as "noeviction".');
    }
  } catch (error: any) {
    logger.warn('Could not automatically configure Redis maxmemory-policy. Please ensure your Redis instance is set to "noeviction" to prevent BullMQ job loss.', { error: error.message });
  }

  logger.info('BullMQ: click-events queue ready.');
};
