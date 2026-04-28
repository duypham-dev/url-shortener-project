import type { PlanTier } from "../../generated/prisma/enums";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
} from "../errors/app.error.js";
import {
  getPlanUsageRepo,
  getFallbackFreePlanRepo,
  getActiveSubscriptionRepo,
  getPendingPaymentRepo,
  hasActiveSubscriptionRepo,
  getActivePlanCreateQuota,
  getFreePlanCreateQuota,
  getAnalyticsAccess
} from "../repositories/subscription.repo";


const getCurrentYearMonth = (date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

// ----------------------------------------------------------------
// Public types
// ----------------------------------------------------------------

export interface ActivePlanSummary {
  id: number;
  name: string;
  tier: PlanTier;
  duration_days: number;
  price: number;
  currency: string;
  max_links: number;
  max_custom_links: number;
  max_qr_codes: number;
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
  qrCodeCount: number;
  remainingLinks: number | null;
  remainingCustomLinks: number | null;
  remainingQrCodes: number | null;
}

export interface ActivePlanContext {
  plan: ActivePlanSummary;
  subscription: ActiveSubscriptionSummary | null;
  usage: UsageSummary;
}

/** Extended context returned only by the /me/plan API (includes pending payment flag) */
export interface FullPlanContext extends ActivePlanContext {
  hasPendingPayment: boolean;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const mapPlan = (plan: {
  id: number;
  name: string;
  tier: PlanTier;
  duration_days: number;
  price: { toNumber?: () => number } | number;
  currency: string;
  max_links: number;
  max_custom_links: number;
  max_qr_codes: number;
  allow_analytics: boolean;
  allow_expiry: boolean;
  allow_custom_domain: boolean;
  allow_qr_code: boolean;
  reset_period: "never" | "monthly" | "yearly";
}): ActivePlanSummary => ({
  ...plan,
  price: typeof plan.price === "number" ? plan.price : Number(plan.price),
});

const buildUsageSummary = (
  plan: ActivePlanSummary,
  rawUsage: { link_count: number; custom_link_count: number; qr_code_count: number } | null,
): UsageSummary => {
  const yearMonth = getCurrentYearMonth();
  const linkCount = rawUsage?.link_count ?? 0;
  const customLinkCount = rawUsage?.custom_link_count ?? 0;
  const qrCodeCount = rawUsage?.qr_code_count ?? 0;

  return {
    yearMonth,
    linkCount,
    customLinkCount,
    qrCodeCount,
    remainingLinks:
      plan.max_links === -1 ? null : Math.max(0, plan.max_links - linkCount),
    remainingCustomLinks:
      plan.max_custom_links === -1
        ? null
        : Math.max(0, plan.max_custom_links - customLinkCount),
    remainingQrCodes:
      plan.max_qr_codes === -1
        ? null
        : plan.max_qr_codes === 0
        ? 0
        : Math.max(0, plan.max_qr_codes - qrCodeCount),
  };
};

// ----------------------------------------------------------------
// Core context fetcher — used by analytics
// Runs 2 queries in parallel (subscription + usage).
// ----------------------------------------------------------------

export const getActivePlanContext = async (
  userId: number,
): Promise<ActivePlanContext> => {
  const yearMonth = getCurrentYearMonth();

  // Run subscription and usage queries in parallel
  const [activeSubscription, rawUsage] = await Promise.all([
    getActiveSubscriptionRepo(userId),
    getPlanUsageRepo(userId, yearMonth),
  ]);

  const planSource = activeSubscription?.subscription_plans
    ? activeSubscription.subscription_plans
    : await getFallbackFreePlanRepo();

  if (!planSource) {
    throw new NotFoundError("Cannot find active free plan.");
  }

  const plan = mapPlan(planSource);
  const usage = buildUsageSummary(plan, rawUsage);

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
  };
};

// ----------------------------------------------------------------
// Check analytics access
// ----------------------------------------------------------------
export const assertAnalyticsAccess = async (
  userId: number,
): Promise<void> => {
  const result = await getAnalyticsAccess(userId);

  if (!result?.subscription_plans?.allow_analytics) {
    throw new ForbiddenError("Analytics feature is only available for paid accounts.");
  }
};  

// ----------------------------------------------------------------
// Full context fetcher — used only by GET /subscriptions/me/plan
// Adds pending payment check on top of base context.
// ----------------------------------------------------------------

export const getFullPlanContext = async (
  userId: number,
): Promise<FullPlanContext> => {
  const [context, pendingPayment] = await Promise.all([
    getActivePlanContext(userId),
    getPendingPaymentRepo(userId),
  ]);

  return {
    ...context,
    hasPendingPayment: Boolean(pendingPayment),
  };
};

// ----------------------------------------------------------------
// Guards
// ----------------------------------------------------------------

export interface LinkQuotaCheckInput {
  userId: number;
  isCustom?: boolean;
  generateQr: boolean;
}

/**
 * Asserts the user can create a new link within their plan limits.
 * Throws QuotaExceededError if any limit is reached.
 */
export const assertCanCreateLink = async (
  input: LinkQuotaCheckInput,
): Promise<void> => {
  const yearMonth = getCurrentYearMonth();

  const [plan, usage] = await Promise.all([
      getActivePlanCreateQuota(input.userId),
      getPlanUsageRepo(input.userId, yearMonth),
    ]);

  const activePlanQuota = plan?.subscription_plans ?? await getFreePlanCreateQuota();

  if (!activePlanQuota) {
    throw new NotFoundError("Cannot find active free plan.");
  }

  
  if(input.isCustom){
    const isCustomQuotaExceeded =
    activePlanQuota.max_custom_links !== -1 &&
    (usage ? usage.custom_link_count : 0) >= activePlanQuota.max_custom_links;

    if(isCustomQuotaExceeded){
      throw new QuotaExceededError(
        "Bạn đã vượt giới hạn link tùy chỉnh của gói hiện tại.",
      );
    }
    return;
  }

  if(input.generateQr){
    const isQrQuotaExceeded =
    activePlanQuota.max_qr_codes !== -1 &&
    (usage ? usage.qr_code_count : 0) >= activePlanQuota.max_qr_codes;

    if(isQrQuotaExceeded){
      throw new QuotaExceededError(
        "Bạn đã vượt giới hạn số QR code trong tháng của gói hiện tại.",
      );
    }
    return;
  }

  const isLinkQuotaExceeded =
    activePlanQuota.max_links !== -1 &&
    (usage ? usage.link_count : 0) >= activePlanQuota.max_links;

  if (!isLinkQuotaExceeded) {
    return;
  }

  throw new QuotaExceededError(
    "Bạn đã vượt giới hạn số link trong tháng của gói hiện tại.",
  );
};

/**
 * Guard for payment creation — prevents duplicate active subscriptions.
 * Throws ConflictError if user already has an active paid subscription.
 */
export const assertNoActiveSubscription = async (
  userId: number,
): Promise<void> => {
  const hasActive = await hasActiveSubscriptionRepo(userId);
  if (hasActive) {
    throw new ConflictError(
      "Bạn đang có gói cước đang hoạt động. Vui lòng hủy gói hiện tại trước khi đăng ký gói mới.",
    );
  }
};
