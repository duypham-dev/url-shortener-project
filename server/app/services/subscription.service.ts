import { prisma } from "../libs/prisma.js";

export const getActiveSubscriptionPlans = async () => {
  return await prisma.subscription_plans.findMany({
    where: {
      is_active: true,
    },
    orderBy: {
      price: 'asc'
    }
  });
};

export const getSubscriptionPlanById = async (planId: number) => {
  return await prisma.subscription_plans.findUnique({
    where: {
        id: planId,
    },
  });
}

export const getSubscriptionPlanPrice= async (planId: number) => {
  const plan = await prisma.subscription_plans.findUnique({
    where: {
        id: planId,
    },
    select: {
      price: true
    }
  });
  return plan ? Number(plan.price) : 0;
}

export const getSubscriptionPlanDuration = async (planId: number) => {
  const plan = await prisma.subscription_plans.findUnique({
    where: {
      id: planId
    },
    select: {
      duration_days: true
    }
  });
  return plan ? Number(plan.duration_days) : 0;
};