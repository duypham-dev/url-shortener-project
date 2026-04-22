/**
 * Routes:
 *   POST   /api/v1/auth/register  
 *   POST   /api/v1/auth/login     
 *   POST   /api/v1/auth/refresh  
 *   POST   /api/v1/auth/logout    
 *   GET    /api/v1/auth/me       
 */
import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
} from "../controllers/auth.controller";
import { googleLogin } from "../controllers/googleLogin.controller";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { globalAuthRateLimit, loginRateLimit, registerRateLimit } from "../middlewares/ratelimit.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import { validate } from "../middlewares/validate.middleware";

const authRouter = Router();

// ---- Public routes ----
authRouter.post("/register", globalAuthRateLimit,
  registerRateLimit,
  validate(registerSchema),
  registerHandler
);

authRouter.post("/login", 
  globalAuthRateLimit, 
  loginRateLimit, 
  validate(loginSchema), 
  loginHandler
);

authRouter.post("/refresh", globalAuthRateLimit, refreshHandler);
authRouter.post("/google", globalAuthRateLimit, googleLogin);

// ---- Protected routes ----
authRouter.post("/logout", verifyToken, logoutHandler);
authRouter.get("/me", verifyToken, getMeHandler);

export default authRouter;