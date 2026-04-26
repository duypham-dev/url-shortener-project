/**
 * subscriptionAccess.service.ts
 *
 * Refactor Notes:
 * - isVipUser(): REPLACED full getActivePlanContext() cascade (3-5 queries + UPDATE)
 *   with a single lightweight existence check on the subscriptions table.
 *   This eliminates the major bottleneck on every auth event.
 * - Removed unused `tx?: Prisma.TransactionClient` parameter from all functions.
 *   The parameter was accepted but never wired through — callers always hit the
 *   global prisma client. Removing avoids misleading callers.
 * - Added explicit `select` to getFallbackFreePlan() and the subscription query
 *   in getActivePlanContext() to avoid fetching unnecessary columns.
 * - Added explicit `select` to activeSubscription query (replaces `include`).
 */
import type { PlanTier } from "../../generated/prisma/enums";
import {
  NotFoundError,
  PaymentRequiredError,
  QuotaExceededError,
} from "../errors/app.error.js";
import {
  getPlanUsageRepo,
  getFallbackFreePlanRepo,
  getActiveSubscriptionRepo,
  getPendingPaymentRepo,
} from "../repositories/subscription.repo";

const getCurrentYearMonth = (date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export interface ActivePlanSummary {
  id: number;
  name: string;
  tier: PlanTier;
  duration_days: number;
  price: number;
  currency: string;
  max_links: number;
  max_custom_links: number;
  allow_analytics: boolean;
  allow_expiry: boolean;
  allow_custom_domain: boolean;
  allow_qr_code: boolean;
  reset_period: "never" | "monthly" | "yearly";
}

export interface ActiveSubscriptionSummary {
  id: string;
  status: "active" | "pending" | "expired" | "cancelled";
  started_at: Date;
  expires_at: Date;
}

export interface UsageSummary {
  yearMonth: string;
  linkCount: number;
  customLinkCount: number;
  remainingLinks: number | null;
  remainingCustomLinks: number | null;
}

export interface ActivePlanContext {
  plan: ActivePlanSummary;
  subscription: ActiveSubscriptionSummary | null;
  usage: UsageSummary;
  hasPendingPayment: boolean;
}

// Select clause matching ActivePlanSummary fields (reused across queries)
const PLAN_SELECT = {
  id: true,
  name: true,
  tier: true,
  duration_days: true,
  price: true,
  currency: true,
  max_links: true,
  max_custom_links: true,
  allow_analytics: true,
  allow_expiry: true,
  allow_custom_domain: true,
  allow_qr_code: true,
  reset_period: true,
} as const;

const mapPlan = (plan: {
  id: number;
  name: string;
  tier: PlanTier;
  duration_days: number;
  price: { toNumber?: () => number } | number;
  currency: string;
  max_links: number;
  max_custom_links: number;
  allow_analytics: boolean;
  allow_expiry: boolean;
  allow_custom_domain: boolean;
  allow_qr_code: boolean;
  reset_period: "never" | "monthly" | "yearly";
}): ActivePlanSummary => ({
  ...plan,
  price: typeof plan.price === "number" ? plan.price : Number(plan.price),
});

const getPlanUsage = async (
  userId: number,
  plan: ActivePlanSummary,
): Promise<UsageSummary> => {
  const yearMonth = getCurrentYearMonth();
  const usage = await getPlanUsageRepo(userId, yearMonth);

  const linkCount = usage?.link_count ?? 0;
  const customLinkCount = usage?.custom_link_count ?? 0;

  return {
    yearMonth,
    linkCount,
    customLinkCount,
    remainingLinks:
      plan.max_links === -1 ? null : Math.max(0, plan.max_links - linkCount),
    remainingCustomLinks:
      plan.max_custom_links === -1
        ? null
        : Math.max(0, plan.max_custom_links - customLinkCount),
  };
};

// const getFallbackFreePlan = async () => {
//   const freePlan = await getFallbackFreePlanRepo();

//   if (!freePlan) {
//     throw new NotFoundError("Không tìm thấy gói miễn phí đang hoạt động.");
//   }

//   return freePlan;
// };

export const getActivePlanContext = async (
  userId: number,
): Promise<ActivePlanContext> => {
  const [activeSubscription, pendingPayment] = await Promise.all([
    getActiveSubscriptionRepo(userId),
    getPendingPaymentRepo(userId),
  ]);

  const planSource = activeSubscription?.subscription_plans
    ? activeSubscription.subscription_plans
    : await getFallbackFreePlanRepo();
  
  if (!planSource) {
    throw new NotFoundError("Cannot find active free plan.");
  }
  
  const plan = mapPlan(planSource);
  const usage = await getPlanUsage(userId, plan);

  return {
    plan,
    subscription: activeSubscription
      ? {
          id: activeSubscription.id,
          status: activeSubscription.status,
          started_at: activeSubscription.started_at,
          expires_at: activeSubscription.expires_at,
        }
      : null,
    usage,
    hasPendingPayment: Boolean(pendingPayment),
  };
};

export interface LinkQuotaCheckInput {
  userId: number;
  isCustom: boolean;
}

export const assertCanCreateLink = async (
  input: LinkQuotaCheckInput,
): Promise<ActivePlanContext> => {
  const context = await getActivePlanContext(input.userId);

  const isLinkQuotaExceeded =
    context.plan.max_links !== -1 &&
    context.usage.linkCount >= context.plan.max_links;

  const isCustomQuotaExceeded =
    input.isCustom &&
    context.plan.max_custom_links !== -1 &&
    context.usage.customLinkCount >= context.plan.max_custom_links;

  if (!isLinkQuotaExceeded && !isCustomQuotaExceeded) {
    return context;
  }

  const errorDetails = {
    planName: context.plan.name,
    tier: context.plan.tier,
    maxLinks: context.plan.max_links,
    maxCustomLinks: context.plan.max_custom_links,
    currentLinks: context.usage.linkCount,
    currentCustomLinks: context.usage.customLinkCount,
  };

  if (context.hasPendingPayment) {
    throw new PaymentRequiredError(
      "Giao dịch nâng cấp đang chờ xác nhận. Vui lòng hoàn tất thanh toán hoặc đợi hệ thống cập nhật.",
      errorDetails,
    );
  }

  if (isCustomQuotaExceeded) {
    throw new QuotaExceededError(
      "Bạn đã vượt giới hạn link tùy chỉnh của gói hiện tại.",
      errorDetails,
    );
  }

  throw new QuotaExceededError(
    "Bạn đã vượt giới hạn số link trong tháng của gói hiện tại.",
    errorDetails,
  );
};
