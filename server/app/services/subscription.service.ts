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
