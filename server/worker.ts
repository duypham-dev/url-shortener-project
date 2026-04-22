import cron from "node-cron";
import { expireSubscriptionsJob } from "./app/jobs/expireSubscriptions.job.js";
import { logger } from "./app/utils/logger.js";

// Run every hour
cron.schedule("0 * * * *", () => {
    logger.info("Running expireSubscriptionsJob via Cron...");
    void expireSubscriptionsJob();
});

logger.info("Worker process initialized. Waiting for cron jobs to trigger...");
