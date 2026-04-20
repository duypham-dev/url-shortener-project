import { Kafka, type Producer } from 'kafkajs';
import { logger } from '../utils/logger';

// ----------------------------------------------------------------
// Config — sourced from env so deployments can override without code changes
// ----------------------------------------------------------------
export const CLICK_EVENTS_TOPIC = process.env.KAFKA_CLICK_TOPIC ?? 'click-events';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') ?? ['localhost:9092'];
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID ?? 'short-link-app';

// ----------------------------------------------------------------
// Shared Kafka client — exported so consumer.ts can reuse it
// instead of spinning up a second independent connection.
// ----------------------------------------------------------------
export const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
});

export const producer: Producer = kafka.producer();

// ----------------------------------------------------------------
// initKafka — called once at server startup.
//
// Design intent:
//   - Click tracking is a non-critical side-effect; the HTTP server
//     must NOT refuse to boot just because Kafka is temporarily down.
//   - Therefore init failures are logged as warnings, not re-thrown.
//   - Admin uses try/finally to guarantee disconnect even on error.
// ----------------------------------------------------------------
export const initKafka = async (): Promise<void> => {
  const admin = kafka.admin();

  try {
    // 1. Ensure topic exists
    await admin.connect();

    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes(CLICK_EVENTS_TOPIC)) {
      logger.info(`Kafka: topic "${CLICK_EVENTS_TOPIC}" not found — creating...`);
      await admin.createTopics({
        topics: [{
          topic: CLICK_EVENTS_TOPIC,
          numPartitions: Number(process.env.KAFKA_PARTITIONS ?? 1),
          replicationFactor: Number(process.env.KAFKA_REPLICATION_FACTOR ?? 1),
        }],
      });
      logger.info(`Kafka: topic "${CLICK_EVENTS_TOPIC}" created successfully.`);
    }

    // 2. Connect producer
    await producer.connect();
    logger.info('Kafka: producer connected successfully.');

  } catch (error) {
    // Non-fatal: log a warning so ops can investigate, but let the server start.
    logger.warn('Kafka: initialization failed — click events will not be tracked until Kafka recovers.', { error });
  } finally {
    // Always disconnect admin, regardless of success or failure.
    try {
      await admin.disconnect();
    } catch {
      // best-effort
    }
  }
};