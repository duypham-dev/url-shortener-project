import { Router } from "express";
import { getSubscriptionPlans } from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.get("/plans", getSubscriptionPlans);

export default subscriptionRouter;
