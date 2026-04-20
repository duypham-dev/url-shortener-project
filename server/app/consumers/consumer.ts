/**
 * consumer.ts — Kafka click-event consumer (standalone process)
 *
 * Run:  npx tsx watch app/consumers/consumer.ts
 *
 * Responsibilities:
 *   - Subscribe to the click-events topic.
 *   - Validate and persist each event to click_logs.
 *   - Shutdown gracefully on SIGINT / SIGTERM.
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
  return (
    typeof d.shortCode === 'string' && d.shortCode.length > 0 &&
    typeof d.longUrl === 'string' &&
    typeof d.timestamp === 'string'
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
        partition,
      });

      try {
        await prisma.click_logs.create({
          data: {
            short_code: clickData.shortCode,
            ip_address: clickData.ip ?? null,
            user_agent: clickData.userAgent ?? null,
            referrer: clickData.referrer ?? null,
            clicked_at: new Date(clickData.timestamp),
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