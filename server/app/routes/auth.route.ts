/**
 * auth.route.ts
 * Định nghĩa các route cho Authentication.
 * Tuân thủ Open/Closed Principle: thêm route mới không sửa file khác.
 *
 * Routes:
 *   POST   /api/v1/auth/register  → Đăng ký
 *   POST   /api/v1/auth/login     → Đăng nhập
 *   POST   /api/v1/auth/refresh   → Làm mới accessToken
 *   POST   /api/v1/auth/logout    → Đăng xuất (protected)
 *   GET    /api/v1/auth/me        → Lấy thông tin bản thân (protected)
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
import { authRateLimit } from "../middlewares/ratelimit.middleware";

const authRouter = Router();

// ---- Public routes ----
authRouter.post("/register", authRateLimit, registerHandler);
authRouter.post("/login", authRateLimit, loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/google", googleLogin);

// ---- Protected routes (yêu cầu accessToken hợp lệ) ----
authRouter.post("/logout", verifyToken, logoutHandler);
authRouter.get("/me", verifyToken, getMeHandler);

export default authRouter;