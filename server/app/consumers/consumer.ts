/**
 * consumer.ts — Kafka click-event consumer (standalone process)
 *
 * Run:  npx tsx watch app/consumers/consumer.ts
 *
 * Design decisions:
 *   - Reuses the shared `kafka` client from kafka.service to avoid
 *     opening a second independent connection with the same clientId.
 *   - `fromBeginning: false` — Kafka tracks offsets per consumer group.
 *     On first run the group has no committed offset, so Kafka will
 *     start from the latest message (default). Setting this to `true`
 *     would replay all historical events on every restart, duplicating
 *     click_logs rows.
 *   - Malformed messages are logged and skipped (dead-letter handling
 *     can be added later if a DLQ topic is introduced).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env before importing any module that reads process.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { kafka, CLICK_EVENTS_TOPIC } from '../services/kafka.service.js';
import type { ClickEventMessage } from '../services/link.service.js';
import { logger } from '../utils/logger.js';

type PrismaInstance = (typeof import('../libs/prisma.js'))['prisma'];

// ----------------------------------------------------------------
// Consumer group — all instances of this process share offsets.
// ----------------------------------------------------------------
const consumer = kafka.consumer({ groupId: 'click-tracking-group' });

// ----------------------------------------------------------------
// Message validation
// ----------------------------------------------------------------
function isValidClickEvent(data: unknown): data is ClickEventMessage {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  const hasValidUrlMappingId =
    typeof d.urlMappingId === 'string' &&
    /^\d+$/.test(d.urlMappingId);

  const hasValidUserId =
    typeof d.userId === 'number' && Number.isInteger(d.userId);

  const hasValidBrowser = d.browser === null || typeof d.browser === 'string';
  const hasValidOs = d.os === null || typeof d.os === 'string';
  const hasValidReferrer = d.referrer === null || typeof d.referrer === 'string';
  const hasValidInteractionType =
    d.interactionType === 'CLICK' || d.interactionType === 'SCAN';

  return (
    typeof d.shortCode === 'string' && d.shortCode.length > 0 &&
    typeof d.longUrl === 'string' &&
    typeof d.ip === 'string' &&
    typeof d.userAgent === 'string' &&
    typeof d.timestamp === 'string' &&
    typeof d.deviceType === 'string' && d.deviceType.length > 0 &&
    hasValidReferrer &&
    hasValidUrlMappingId &&
    hasValidUserId &&
    hasValidBrowser &&
    hasValidOs &&
    hasValidInteractionType
  );
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
let prisma: PrismaInstance;

const startConsumer = async () => {
  const prismaModule = await import('../libs/prisma.js');
  prisma = prismaModule.prisma;

  await consumer.connect();
  logger.info('Kafka consumer connected.');

  await consumer.subscribe({ topic: CLICK_EVENTS_TOPIC, fromBeginning: false });
  logger.info(`Kafka consumer subscribed to topic "${CLICK_EVENTS_TOPIC}".`);

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      if (!message.value) return;

      let clickData: unknown;
      try {
        clickData = JSON.parse(message.value.toString());
      } catch {
        logger.warn('Kafka consumer: received non-JSON message — skipping.', { partition });
        return;
      }

      if (!isValidClickEvent(clickData)) {
        logger.warn('Kafka consumer: malformed click event — skipping.', { partition, clickData });
        return;
      }

      logger.info('Kafka consumer: persisting click event.', {
        shortCode: clickData.shortCode,
        userId: clickData.userId,
        urlMappingId: clickData.urlMappingId,
        partition,
      });

      try {
        let parsedUrlMappingId: bigint;
        let clickedAt: Date;

        try {
          parsedUrlMappingId = BigInt(clickData.urlMappingId);
        } catch {
          logger.warn('Kafka consumer: invalid urlMappingId - skipping message.', {
            urlMappingId: clickData.urlMappingId,
          });
          return;
        }

        clickedAt = new Date(clickData.timestamp);
        if (Number.isNaN(clickedAt.getTime())) {
          logger.warn('Kafka consumer: invalid timestamp - skipping message.', {
            timestamp: clickData.timestamp,
          });
          return;
        }

        await prisma.click_logs.create({
          data: {
            url_mapping_id: parsedUrlMappingId,
            short_code: clickData.shortCode,
            user_id: clickData.userId,
            ip_address: clickData.ip ?? null,
            browser: clickData.browser,
            os: clickData.os,
            device_type: clickData.deviceType,
            user_agent: clickData.userAgent ?? null,
            referrer: clickData.referrer ?? null,
            clicked_at: clickedAt,
            // InteractionType: CLICK for regular link hits, SCAN for QR code scans
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            interaction_type: (clickData.interactionType ?? 'CLICK') as any,
          },
        });
      } catch (error) {
        logger.error('Kafka consumer: DB insert failed.', { error, shortCode: clickData.shortCode });
      }
    },
  });
};

// ----------------------------------------------------------------
// Graceful shutdown — handles both SIGINT (Ctrl+C) and SIGTERM
// (Docker / Kubernetes stop signals).
// ----------------------------------------------------------------
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal} — disconnecting Kafka consumer...`);
  try {
    await consumer.disconnect();
    await prisma.$disconnect();
    logger.info('Kafka consumer disconnected cleanly. Exiting.');
  } catch (error) {
    logger.error('Error during shutdown.', { error });
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startConsumer().catch((error) => {
  logger.error('Kafka consumer failed to start.', { error });
  process.exit(1);
});