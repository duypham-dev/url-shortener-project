import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "../controllers/auth.controller";
import { googleLogin } from "../controllers/googleLogin.controller";
import { verifyToken } from "../middlewares/verifyToken.middleware";
import { globalAuthRateLimit, loginRateLimit, registerRateLimit } from "../middlewares/ratelimit.middleware";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/auth.schema";
import { validate } from "../middlewares/validate.middleware";
import { googleLoginSchema } from "../schemas/googleLogin.schema";

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

// Google OAuth: validate credential + csrf token before calling controller
authRouter.post(
  "/google",
  globalAuthRateLimit,
  validate(googleLoginSchema),
  googleLogin,
);

authRouter.post("/forgot-password", globalAuthRateLimit, validate(forgotPasswordSchema), forgotPasswordHandler);
authRouter.post("/reset-password", globalAuthRateLimit, validate(resetPasswordSchema), resetPasswordHandler);

// ---- Protected routes ----
authRouter.post("/logout", verifyToken, logoutHandler);
authRouter.get("/me", verifyToken, getMeHandler);

export default authRouter;