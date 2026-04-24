import { prisma } from "../libs/prisma";
import { getActiveSubscriptionPlans as getActiveSubscriptionPlansRepo,
        getSubscriptionPlanById as getSubscriptionPlanByIdRepo
 } from "../repositories/subscription.repo";

export const getActiveSubscriptionPlans = async () => {
  return await getActiveSubscriptionPlansRepo();
};

export const getSubscriptionPlanById = async (planId: number) => {
  
  return await getSubscriptionPlanByIdRepo(planId);
};