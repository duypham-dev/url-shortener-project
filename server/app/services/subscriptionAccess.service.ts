import type { Prisma } from "../../generated/prisma/client";
import type { PlanTier } from "../../generated/prisma/enums";
import { prisma } from "../libs/prisma";
import {
  NotFoundError,
  PaymentRequiredError,
  QuotaExceededError,
} from "../errors/app.error.js";

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

const mapPlan = (plan: {
  id: number;
  name: string;
  tier: PlanTier;
  duration_days: number;
  price: Prisma.Decimal;
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
  price: Number(plan.price),
});

const getPlanUsage = async (
  userId: number,
  plan: ActivePlanSummary,
  tx?: Prisma.TransactionClient,
): Promise<UsageSummary> => {
  const yearMonth = getCurrentYearMonth();

  const usage = await prisma.user_link_monthly_usage.findUnique({
    where: {
      user_id_year_month: {
        user_id: userId,
        year_month: yearMonth,
      },
    },
    select: {
      link_count: true,
      custom_link_count: true,
    },
  });

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

const getFallbackFreePlan = async (tx?: Prisma.TransactionClient) => {

  const freePlan = await prisma.subscription_plans.findFirst({
    where: {
      tier: "free",
      is_active: true,
    },
    orderBy: {
      price: "asc",
    },
  });

  if (!freePlan) {
    throw new NotFoundError("Không tìm thấy gói miễn phí đang hoạt động.");
  }

  return freePlan;
};

const syncExpiredSubscriptions = async (
  userId: number,
  tx?: Prisma.TransactionClient,
): Promise<void> => {
  await prisma.subscriptions.updateMany({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { lte: new Date() },
    },
    data: {
      status: "expired",
    },
  });
};

export const getActivePlanContext = async (
  userId: number,
  tx?: Prisma.TransactionClient,
): Promise<ActivePlanContext> => {

  await syncExpiredSubscriptions(userId, tx);

  const [activeSubscription, pendingPayment] = await Promise.all([
    prisma.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: "active",
        expires_at: { gt: new Date() },
      },
      orderBy: {
        expires_at: "desc",
      },
      include: {
        subscription_plans: true,
      },
    }),
    prisma.payments.findFirst({
      where: {
        user_id: userId,
        status: "pending",
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
      },
    }),
  ]);

  const planSource = activeSubscription?.subscription_plans
    ? activeSubscription.subscription_plans
    : await getFallbackFreePlan(tx);

  const plan = mapPlan(planSource);
  const usage = await getPlanUsage(userId, plan, tx);

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

export const isVipUser = async (userId: number): Promise<boolean> => {
  const context = await getActivePlanContext(userId);
  return context.plan.tier !== "free";
};
