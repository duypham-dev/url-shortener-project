import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import geoip from 'geoip-lite';
import { prisma } from '../libs/prisma.js';
import { logger } from '../utils/logger.js';
import { CLICK_EVENTS_QUEUE } from '../services/queue.service.js';
import type { ClickEventMessage } from '../services/link.service.js';

// Dedicated ioredis instance for BullMQ worker
const bullConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Separate connection for Pub/Sub publishing (cannot mix commands and subscribe modes)
const redisPub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export const startClickWorker = (): Worker => {
  const worker = new Worker(
    CLICK_EVENTS_QUEUE,
    async (job: Job<ClickEventMessage>) => {
      const data = job.data;

      // GeoIP lookup
      const geo = geoip.lookup(data.ip);
      const country = geo?.country ?? null;

      // Persist click to database
      await prisma.click_logs.create({
        data: {
          url_mapping_id: BigInt(data.urlMappingId),
          short_code: data.shortCode,
          user_id: data.userId,
          ip_address: data.ip ?? null,
          browser: data.browser,
          os: data.os,
          device_type: data.deviceType,
          user_agent: data.userAgent ?? null,
          referrer: data.referrer ?? null,
          clicked_at: new Date(data.timestamp),
          interaction_type: (data.interactionType ?? 'CLICK') as any,
          country,
        },
      });

      // Broadcast to SSE clients via Redis Pub/Sub
      await redisPub.publish('click-stream', JSON.stringify(data));

      logger.info('BullMQ worker: click persisted', { shortCode: data.shortCode });
    },
    {
      connection: bullConnection,
      concurrency: 5,
    },
  );

  worker.on('failed', (job: Job<ClickEventMessage> | undefined, err: Error) => {
    logger.error('BullMQ worker: job failed', { jobId: job?.id, error: err });
  });

  logger.info('BullMQ click worker started.');
  return worker;
};
