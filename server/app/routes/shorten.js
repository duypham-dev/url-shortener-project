import express from 'express'

const router = express.Router()

// GET /api/shorten - simple example response for quick testing
router.get('/shorten', (req, res) => {
  const example = {
    originalUrl: 'https://example.com',
    shortUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/abc123`,
    createdAt: new Date().toISOString(),
  }
  res.json({
    success: true,
    message: 'Short URL get successfully',
    data: example 
    })
})

// POST /api/shorten - create a fake short URL
router.post('/shorten', (req, res) => {
  const { originalUrl } = req.body || {}
  if (!originalUrl) {
    return res.status(400).json({ error: 'originalUrl is required' })
  }

  const id = Math.random().toString(36).slice(2, 8)
  const shortUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/${id}`
  const result = { originalUrl, shortUrl, createdAt: new Date().toISOString() }
  res.json({
    success: true,
    message: 'Short URL created successfully',
    data: result
  })
})

export default router
