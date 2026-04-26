import {
  expireSubscriptionsRepo,
  expireStalePendingPaymentsRepo,
} from "../repositories/subscription.repo";
import { logger } from "../utils/logger";

/**
 * Background job: runs periodically to clean up expired/stale records.
 *
 * 1. Expire active subscriptions past their expires_at date (auto-downgrade).
 * 2. Cancel stale pending payments older than 15 minutes (cleanup orphans).
 */
export const expireSubscriptionsJob = async () => {
  try {
    // 1. Auto-downgrade expired subscriptions
    const expireResult = await expireSubscriptionsRepo();
    if (expireResult.count > 0) {
      logger.info(`Expired ${expireResult.count} subscription(s).`);
    }

    // 2. Cleanup stale pending payments + their linked subscriptions
    const cleanupResult = await expireStalePendingPaymentsRepo();
    if (cleanupResult.paymentCount > 0 || cleanupResult.subscriptionCount > 0) {
      logger.info(
        `Cleaned up ${cleanupResult.paymentCount} stale payment(s), ` +
        `${cleanupResult.subscriptionCount} orphan subscription(s).`,
      );
    }
  } catch (error) {
    logger.error("Failed to run expireSubscriptionsJob", { error });
  }
};
