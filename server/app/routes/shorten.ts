import express from 'express'
import { prisma } from '../libs/prisma.js';
const router = express.Router()
import genShortLink from '../controllers/generateLink.controller';
// GET /api/shorten - simple example response for quick testing
router.get('/shorten', genShortLink);
// POST /api/shorten - create a fake short URL
router.post('/shorten', genShortLink);


export default router
