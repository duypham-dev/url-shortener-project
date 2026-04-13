import {prisma} from "../libs/prisma"
import { logger } from '../utils/logger';
import type {Request, Response} from "express";
import { getCachedLink, cacheLink } from '../services/linkCache.service';
import { Kafka } from 'kafkajs';
import { producer } from '../services/kafka.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

interface MessageInput {
  shortCode: string;
  longUrl: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}

const redirectLink = async (req: Request, res: Response) => {
  const { shortCode } = req.params as { shortCode: string };
  logger.info('Received short code for redirection', { shortCode });

  try {
    // Check cache first before querying the database
    let cachedUrl: string | null = null;
    cachedUrl = await getCachedLink(shortCode);
    console.log("Cached URL:", cachedUrl);
    if (cachedUrl) {
      const message: MessageInput = {
        shortCode,
        longUrl: cachedUrl,
        ip: req.ip as string,
        userAgent: req.get('User-Agent') as string,
        timestamp: new Date().toISOString()
      };
      // Push click event to Kafka for analytics
      await pushMessage(message);

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

    const message: MessageInput = {
      shortCode,
      longUrl: url.long_url,
      ip: req.ip as string,
      userAgent: req.get('User-Agent') as string,
      timestamp: new Date().toISOString()
    };
    await pushMessage(message);

    res.redirect(url.long_url);
  } catch (error) {
    logger.error('Error occurred while redirecting link', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const pushMessage = async (message: MessageInput) => {
  try{
    logger.info('Sending message to Kafka', { message });
    await producer.send({
      topic: 'click-events',
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (error) {
    logger.error('Error sending message to Kafka', { error });
  }
};

export default redirectLink;