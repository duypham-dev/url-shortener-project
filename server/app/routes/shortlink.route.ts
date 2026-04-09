import express from 'express'
import { prisma } from '../libs/prisma.js';
const router = express.Router()
import genShortLink from '../controllers/generateLink.controller.js';
// POST /api/shorten - create a fake short URL
router.post('/shorten', genShortLink);
// GET /api/shorten - simple example response for quick testing
router.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  // Implementation for handling short code lookup
    const link = await prisma.url_mappings.findUnique({
      where: {
        short_code: shortCode,
      }
    });
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.redirect(link.long_url);
});

router.get('/duy/:id', async (req, res) => {
  const { id } = req.params;
  console.log("Received ID:", id);
res.status(200).json({ message: `Received ID: ${id}` });
})



export default router
