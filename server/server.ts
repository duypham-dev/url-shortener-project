import 'dotenv/config';
import app from './app/index.js';
import { initQueue } from './app/services/queue.service.js';
import { startClickWorker } from './app/workers/clickWorker.js';
import { logger } from './app/utils/logger.js';
import { expireSubscriptionsJob } from './app/jobs/expireSubscriptions.job.js';

const PORT = Number(process.env.PORT ?? 3000);

async function startServer() {
  // Init BullMQ queue
  await initQueue();

  // Start in-process click worker
  startClickWorker();

  // Schedule subscription expiry — runs every 5 minutes.
  // Also fires once immediately after boot to handle any backlog.
  const EXPIRY_INTERVAL_MS = 5 * 60 * 1000;
  void expireSubscriptionsJob(); // fire-and-forget on startup
  setInterval(() => void expireSubscriptionsJob(), EXPIRY_INTERVAL_MS);

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error('Fatal error during server startup.', { error });
  process.exit(1);
});