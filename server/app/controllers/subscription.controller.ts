import { Request, Response } from "express";
import { prisma } from "../libs/prisma.js";

export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.subscription_plans.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        price: 'asc'
      }
    });
    res.status(200).json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ message: "Lỗi Server" });
  }
};
