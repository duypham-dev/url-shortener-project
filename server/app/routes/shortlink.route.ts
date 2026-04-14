import express from 'express'
import { prisma } from '../libs/prisma.js';
const router = express.Router()
import genShortLink from '../controllers/generateLink.controller.js';
import redirectLink from '../controllers/redirecLink.controller.js';
import getLinks from '../controllers/getLinks.controller.js';
import { verifyToken } from '../middlewares/verifyToken.middleware.js';

// GET /api/v1/links - get user's links
router.get('/links', verifyToken, getLinks);

// POST /api/shorten - create a short URL
router.post('/shorten', verifyToken, genShortLink);

// GET /api/shorten - simple example response for quick testing
router.get('/:shortCode', redirectLink);

router.get('/duy/:id', async (req, res) => {
  const { id } = req.params;
  console.log("Received ID:", id);
res.status(200).json({ message: `Received ID: ${id}` });
})



export default router
