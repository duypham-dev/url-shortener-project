import { Router } from "express";
import {
	getMyPlanAccess,
	getSubscriptionPlans,
} from "../controllers/subscription.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middleware.js";

const subscriptionRouter = Router();

subscriptionRouter.get("/plans", getSubscriptionPlans);
subscriptionRouter.get("/me/plan", verifyToken, getMyPlanAccess);

export default subscriptionRouter;
