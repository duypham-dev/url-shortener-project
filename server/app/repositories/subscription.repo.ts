import { prisma } from "../libs/prisma";
import type { PlanTier } from "../../generated/prisma/enums";

export const PLAN_SELECT = {
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

export const getPlanUsageRepo = async (userId: number, yearMonth: string) => {
  return await prisma.user_link_monthly_usage.findUnique({
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
};

export const getFallbackFreePlanRepo = async () => {
  return await prisma.subscription_plans.findFirst({
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

export const getActiveSubscriptionRepo = async (userId: number) => {
  return await prisma.subscriptions.findFirst({
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

export const getPendingPaymentRepo = async (userId: number) => {
  return await prisma.payments.findFirst({
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
  });
};

export const expireSubscriptionsRepo = async () => {
  return await prisma.subscriptions.updateMany({
    where: {
      status: "active",
      expires_at: { lte: new Date() },
    },
    data: {
      status: "expired",
    },
  });
};

export const checkIsVipUserRepo = async (userId: number) => {
  const sub = await prisma.subscriptions.findFirst({
    where: {
      user_id: userId,
      status: "active",
      expires_at: { gt: new Date() },
    },
    select: { id: true }
  });
  return !!sub;
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
}