/**
 * shortlink.route.ts
 *
 * Refactor Notes:
 * - Phase 6: Removed unused `import { prisma }` (was imported but never used).
 * - Phase 6: Removed debug route `GET /duy/:id` (test/dev artifact).
 */
import express from 'express'
const router = express.Router()
import genShortLink from '../controllers/generateLink.controller.js';
import redirectLink from '../controllers/redirecLink.controller.js';
import getLinks from '../controllers/getLinks.controller.js';
import getLinkInfo from '../controllers/getLinkInfo.controller.js';
import { getLinkAnalytics } from '../controllers/analytics.controller.js';
import { verifyToken } from '../middlewares/verifyToken.middleware.js';
import { enforceCreateLinkQuota } from '../middlewares/quota.middleware.js';

// GET /api/v1/links - get user's links
router.get('/links', verifyToken, getLinks);

// GET /api/v1/links/:shortCode - get info of a single link
router.get('/links/:shortCode', verifyToken, getLinkInfo);

// GET /api/v1/links/:shortCode/analytics - link click analytics (paid feature)
router.get('/links/:shortCode/analytics', verifyToken, getLinkAnalytics);

// POST /api/shorten - create a short URL
router.post('/shorten', verifyToken, enforceCreateLinkQuota, genShortLink);

// GET /api/v1/:shortCode - redirect to long URL
router.get('/:shortCode', redirectLink);

export default router
