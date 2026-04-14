import type { Request, Response } from "express";
import { getActiveSubscriptionPlans } from "../services/subscription.service.js";

export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const plans = await getActiveSubscriptionPlans();
    res.status(200).json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ message: "Lỗi Server" });
  }
};
