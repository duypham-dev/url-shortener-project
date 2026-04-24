import express from "express";
const router = express.Router();

// Controllers
import redirectLink from "../controllers/redirecLink.controller.js";
import {
  getLinkAnalytics,
  getLinkClickLogs,
} from "../controllers/analytics.controller.js";
import { clickStreamHandler } from "../controllers/stream.controller.js";
import { linkController } from "../controllers/link.controller.js";

// Middleware
import { verifyToken } from "../middlewares/verifyToken.middleware.js";
import { enforceCreateLinkQuota } from "../middlewares/quota.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { redirectRateLimit } from "../middlewares/Redirectratelimit.middleware.js";


// Schemas
import { urlSchema, getLinksQuerySchema } from "../schemas/link.schema.js";
import { shortCodeSchema } from "../schemas/shortCode.schema.js";

// GET /api/v1/links — get paginated list of user's links
router.get(
  "/links",
  verifyToken,
  validate(getLinksQuerySchema),
  linkController.getLinksList,
);

// GET /api/v1/links/:shortCode — get info of a single link
router.get(
  "/links/:shortCode",
  verifyToken,
  validate(shortCodeSchema),
  linkController.getLinkInfor,
);

// GET /api/v1/links/:shortCode/analytics — link click analytics (paid feature)
router.get(
  "/links/:shortCode/analytics",
  verifyToken,
  validate(shortCodeSchema),
  getLinkAnalytics,
);

// GET /api/v1/links/:shortCode/clicks — paginated click logs (paid feature)
router.get(
  "/links/:shortCode/clicks",
  verifyToken,
  validate(shortCodeSchema),
  getLinkClickLogs,
);

// POST /api/v1/shorten — create a short URL
router.post(
  "/shorten",
  verifyToken,
  validate(urlSchema),
  enforceCreateLinkQuota,
  linkController.genShortLink,
);

// GET /api/v1/clicks/stream — SSE stream for authenticated user's click events
router.get("/clicks/stream", clickStreamHandler);

// GET /api/v1/:shortCode — redirect to long URL
router.get("/:shortCode", redirectRateLimit, validate(shortCodeSchema), redirectLink);

export default router;