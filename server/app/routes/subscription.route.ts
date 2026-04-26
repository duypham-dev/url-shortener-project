import { Router } from "express";
import {
	getMyPlanAccess,
	getSubscriptionPlans,
	cancelMySubscription,
} from "../controllers/subscription.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middleware.js";

const subscriptionRouter = Router();

subscriptionRouter.get("/plans", getSubscriptionPlans);
subscriptionRouter.get("/me/plan", verifyToken, getMyPlanAccess);
subscriptionRouter.post("/me/cancel", verifyToken, cancelMySubscription);

export default subscriptionRouter;
