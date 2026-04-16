import { prisma } from "../libs/prisma";

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
};