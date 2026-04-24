import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../utils/response";
import generateShortLink from "../services/generateLink.service";
import { getLinkInfoByShortCode } from "../services/link.service.js";
import { getUserLinks } from "../services/link.service.js";

import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors/app.error.js";

interface ShortenRequestBody {
  originalUrl: string;
}

interface ShortenResponseBody {
  shortUrl: string;
  originalUrl: string;
}

// Controller function to generate short URL
export const genShortLink = async (
  req: Request<{}, ShortenResponseBody, ShortenRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { originalUrl } = req.body;
    // Get userId from auth middleware
    const userId = req.user?.userId ?? null;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    // Can check danger URL here before generating short link (optional)
    
    // Call generate short URL service
    const shortUrl = await generateShortLink(originalUrl, userId);
    
    res.status(201).json({
      success: true,
      message: "Short URL created successfully.",
      data: {
        shortUrl,
        originalUrl,
        createdAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    next(error);
  }
};

// Controller function to get paginated list of user's links
export const getLinksList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    const limit = req.query.limit as unknown as number;

    const cursor = req.query.cursor ? BigInt(req.query.cursor as string) : undefined;

    const { links, hasNextPage, nextCursor } = await getUserLinks(userId, {
      limit,
      ...(cursor !== undefined ? { cursor } : {}),
    });
    
    res.status(200).json({
      success: true,
      data: links,
      pagination: {
        limit,
        hasNextPage,
        nextCursor,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Controller function to get link info by short code
export const getLinkInfor = async (
  req: Request<{ shortCode: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { shortCode } = req.params;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    const link = await getLinkInfoByShortCode(shortCode, userId);

    if (!link) {
      throw new NotFoundError("Link not found.");
    }

    res.status(200).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
};

export const linkController = {
    genShortLink,
    getLinksList,
    getLinkInfor,
}
