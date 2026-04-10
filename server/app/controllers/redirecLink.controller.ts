import {prisma} from "../libs/prisma"
import { logger } from '../utils/logger';
import type {Request, Response} from "express";
import { getCachedLink, cacheLink } from '../services/linkCache.service';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const redirectLink = async (req: Request, res: Response) => {
  const { shortCode } = req.params as { shortCode: string };
  logger.info('Received short code for redirection', { shortCode });

  try {
    // Check cache first    const cachedUrl = await getCachedLink(shortCode);
    let cachedUrl: string | null = null;
    cachedUrl = await getCachedLink(shortCode);

    if (cachedUrl) {
      logger.info('Cache hit for short code', { shortCode });
      return res.redirect(cachedUrl);
    }

    logger.info('Cache miss for short code, querying database', { shortCode });

    const url = await prisma.url_mappings.findUnique({
      where: {
        short_code: shortCode 
      }
    });

    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }
    // Cache the result for future requests
    await cacheLink(shortCode, url.long_url);

    res.redirect(url.long_url);
  } catch (error) {
    logger.error('Error occurred while redirecting link', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default redirectLink;