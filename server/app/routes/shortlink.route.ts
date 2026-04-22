import express from 'express'
const router = express.Router()

// Controllers
import genShortLink from '../controllers/generateLink.controller.js';
import redirectLink from '../controllers/redirecLink.controller.js';
import getLinkInfoController from '../controllers/getLinkInfo.controller.js';
import { getLinkAnalytics, getLinkClickLogs } from '../controllers/analytics.controller.js';
import { clickStreamHandler } from '../controllers/stream.controller.js';
import getLinksController from '../controllers/getLinks.controller.js';

// Middleware
import { verifyToken } from '../middlewares/verifyToken.middleware.js';
import { enforceCreateLinkQuota } from '../middlewares/quota.middleware.js';

// GET /api/v1/links - get user's links
router.get('/links', verifyToken, getLinksController);

// GET /api/v1/links/:shortCode - get info of a single link
router.get('/links/:shortCode', verifyToken, getLinkInfoController);

// GET /api/v1/links/:shortCode/analytics - link click analytics (paid feature)
router.get('/links/:shortCode/analytics', verifyToken, getLinkAnalytics);
// GET /api/v1/links/:shortCode/clicks - paginated click logs for a link (paid feature)
router.get('/links/:shortCode/clicks', verifyToken, getLinkClickLogs);

// POST /api/shorten - create a short URL
router.post('/shorten', verifyToken, enforceCreateLinkQuota, genShortLink);

// SSE stream for a user's click events (authenticated users)
router.get('/clicks/stream', clickStreamHandler);

// GET /api/v1/:shortCode - redirect to long URL
router.get('/:shortCode', redirectLink);

export default router
