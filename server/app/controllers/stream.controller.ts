import type { Request, Response, NextFunction } from 'express';
import { initClickStreamConsumer, addSseClient } from '../services/clickStream.service.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.util.js';

export const clickStreamHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Accept token via query `?token=...`, cookie `access_token`, or Authorization header.
    const queryToken = req.query.token;
    const tokenFromQuery =
      typeof queryToken === 'string'
        ? queryToken
        : Array.isArray(queryToken) && typeof queryToken[0] === 'string'
          ? queryToken[0]
          : undefined;
    const tokenFromCookie = typeof req.cookies?.access_token === 'string' ? req.cookies.access_token : undefined;
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const token = tokenFromQuery ?? tokenFromCookie ?? tokenFromHeader;
    if (!token) {
      res.status(401).json({ success: false, message: 'Missing authentication token for SSE stream.' });
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      res.status(401).json({ success: false, message: 'Invalid or expired token for SSE stream.' });
      return;
    }

    // Ensure Kafka consumer is running (idempotent)
    await initClickStreamConsumer();

    // Register this SSE client and associate with the authenticated user
    addSseClient(res, payload.userId);

    logger.info('SSE client connected for click stream', { userId: payload.userId });
    // Do not end the response — keep connection open for SSE
  } catch (error) {
    next(error);
  }
};
