import { expireSubscriptionsRepo } from "../repositories/subscription.repo";
import { logger } from "../utils/logger";

export const expireSubscriptionsJob = async () => {
  try {
    const result = await expireSubscriptionsRepo();
    if (result.count > 0) {
      logger.info(`Successfully expired ${result.count} subscriptions.`);
    }
  } catch (error) {
    logger.error("Failed to run expireSubscriptionsJob", { error });
  }
};
