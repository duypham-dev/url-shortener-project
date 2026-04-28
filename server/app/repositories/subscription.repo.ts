import { prisma } from "../libs/prisma";

// ----------------------------------------------------------------
// Shared select clause matching ActivePlanSummary shape.
// Reused by multiple queries to ensure consistent plan data.
// ----------------------------------------------------------------
export const PLAN_SELECT = {
  id: true,
  name: true,
  tier: true,
  duration_days: true,
  price: true,
  currency: true,
  max_links: true,
  max_custom_links: true,
  max_qr_codes: true,
  allow_analytics: true,
  allow_expiry: true,
  allow_custom_domain: true,
  allow_qr_code: true,
  reset_period: true,
} as const;

// ----------------------------------------------------------------
// Monthly usage
// ----------------------------------------------------------------

export const getPlanUsageRepo = async (userId: number, yearMonth: string) => {
  return prisma.user_link_monthly_usage.findUnique({
    where: {
      user_id_year_month: {
        user_id: userId,
        year_month: yearMonth,
      },
    },
    select: {
      link_count: true,
      custom_link_count: true,
      qr_code_count: true,
    },
  });
};

// ----------------------------------------------------------------
// Subscription plan catalogue
// ----------------------------------------------------------------

export const getFallbackFreePlanRepo = async () => {
  return prisma.subscription_plans.findFirst({
    where: {
      tier: "free",
      is_active: true,
    },
    orderBy: {
      price: "asc",
    },
    select: PLAN_SELECT,
  });
};

export const getFreePlanCreateQuota = async () => {
  return prisma.subscription_plans.findFirst({
    where: {
      tier: "free",
    },
    select: {
      max_links: true,
      max_custom_links: true,
      max_qr_codes: true,
    },
  });
};

export const getActiveSubscriptionPlans = async () => {
  return prisma.subscription_plans.findMany({
    where: {
      is_active: true,
    },
    orderBy: {
      price: "asc",
    },
    select: {
      id: true,
      name: true,
      tier: true,
      duration_days: true,
      price: true,
      currency: true,
      max_links: true,
      max_custom_links: true,
      max_qr_codes: true,
      reset_period: true,
      allow_analytics: true,
      allow_expiry: true,
      allow_custom_domain: true,
      allow_qr_code: true,
    },
  });
};

export const getSubscriptionPlanById = async (planId: number) => {
  return prisma.subscription_plans.findUnique({
    where: {
      id: planId,
    },
    select: {
      id: true,
      name: true,
      tier: true,
      price: true,
      currency: true,
      is_active: true,
    },
  });
};

// ----------------------------------------------------------------
// Active subscription queries
// ----------------------------------------------------------------

/**
 * Full active subscription query — includes plan data.
 * Used by getActivePlanContext to build the full context object.
 */
export const getActiveSubscriptionRepo = async (userId: number) => {
  return prisma.subscriptions.findFirst({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { gt: new Date() },
    },
    orderBy: {
      expires_at: "desc",
    },
    select: {
      id: true,
      status: true,
      started_at: true,
      expires_at: true,
      subscription_plans: {
        select: PLAN_SELECT,
      },
    },
  });
};

export const getActivePlanCreateQuota = async (userId: number) => {
  return prisma.subscriptions.findFirst({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { gt: new Date() },
    },
    orderBy: {
      expires_at: "desc",
    },
    select: {
      subscription_plans: {
        select: {
          max_links: true,
          max_custom_links: true,
          max_qr_codes: true,
        },
      },
    },
  });
};  

// Check analytics access
export const getAnalyticsAccess = async (userId: number) => {
  return prisma.subscriptions.findFirst({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { gt: new Date() },
    },
    orderBy: {
      expires_at: "desc",
    },
    select: {
      subscription_plans: {
        select: {
          allow_analytics: true,
        },
      },
    },
  });
};

/**
 * Lightweight existence check — returns true if user has any active subscription.
 * Used as a guard before creating new payments.
 */
export const hasActiveSubscriptionRepo = async (userId: number): Promise<boolean> => {
  const sub = await prisma.subscriptions.findFirst({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { gt: new Date() },
    },
    select: { id: true },
  });
  return !!sub;
};

// ----------------------------------------------------------------
// Pending payment queries
// ----------------------------------------------------------------

const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if user has a non-expired pending payment.
 * Only considers payments created within the TTL window.
 */
export const getPendingPaymentRepo = async (userId: number) => {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MS);

  return prisma.payments.findFirst({
    where: {
      user_id: userId,
      status: "pending",
      created_at: { gte: cutoff },
    },
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
    },
  });
};

// ----------------------------------------------------------------
// Subscription mutations
// ----------------------------------------------------------------

/**
 * Cancel the user's currently active subscription immediately.
 * Returns the updated subscription or null if none was active.
 */
export const cancelActiveSubscriptionRepo = async (userId: number) => {
  // Use updateMany because findFirst + update is not atomic.
  // Returns count of rows updated (0 or 1).
  return prisma.subscriptions.updateMany({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { gt: new Date() },
    },
    data: {
      status: "cancelled",
    },
  });
};

// ----------------------------------------------------------------
// Background job operations
// ----------------------------------------------------------------

/**
 * Mark all expired active subscriptions as 'expired'.
 * Called periodically by the expiry background job.
 */
export const expireSubscriptionsRepo = async () => {
  return prisma.subscriptions.updateMany({
    where: {
      status: "active",
      expires_at: { lte: new Date() },
    },
    data: {
      status: "expired",
    },
  });
};

/**
 * Cancel stale pending payments (older than TTL) and their linked subscriptions.
 * Runs as part of the periodic cleanup job.
 */
export const expireStalePendingPaymentsRepo = async () => {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MS);

  // Use a transaction to atomically cancel both payment and subscription
  return prisma.$transaction(async (tx) => {
    // 1. Find stale pending payments
    const stalePayments = await tx.payments.findMany({
      where: {
        status: "pending",
        created_at: { lt: cutoff },
      },
      select: {
        id: true,
        subscription_id: true,
      },
    });

    if (stalePayments.length === 0) {
      return { paymentCount: 0, subscriptionCount: 0 };
    }

    const paymentIds = stalePayments.map((p) => p.id);
    const subscriptionIds = stalePayments
      .map((p) => p.subscription_id)
      .filter((id): id is string => id !== null);

    // 2. Mark payments as failed
    const paymentResult = await tx.payments.updateMany({
      where: { id: { in: paymentIds } },
      data: { status: "failed" },
    });

    // 3. Cancel linked pending subscriptions
    let subscriptionResult = { count: 0 };
    if (subscriptionIds.length > 0) {
      subscriptionResult = await tx.subscriptions.updateMany({
        where: {
          id: { in: subscriptionIds },
          status: "pending",
        },
        data: { status: "cancelled" },
      });
    }

    return {
      paymentCount: paymentResult.count,
      subscriptionCount: subscriptionResult.count,
    };
  });
};