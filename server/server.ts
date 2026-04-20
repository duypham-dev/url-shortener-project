import 'dotenv/config';
import app from './app/index.js';
import { initKafka } from './app/services/kafka.service.js';
import { logger } from './app/utils/logger.js';

const PORT = Number(process.env.PORT ?? 3000);

async function startServer() {
  // initKafka is non-fatal — server boots even if Kafka is temporarily unavailable.
  await initKafka();

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error('Fatal error during server startup.', { error });
  process.exit(1);
});