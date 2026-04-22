/**
 * generateLink.controller.ts
 *
 * Refactor Notes:
 * - Phase 4: Replaced inline res.status(401/400/422) responses with
 *   throw UnauthorizedError/BadRequestError/ValidationError.
 *   All errors now flow through the global errorHandler middleware
 *   via try/catch → next(error), ensuring consistent error response format.
 */
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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const URL_REGEX = /^https?:\/\/.{1,2048}$/;

// Helper function to validate URL format
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) && URL_REGEX.test(url);
  } catch {
    return false;
  }
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

    if (!originalUrl?.trim()) {
      throw new BadRequestError("URL is required.");
    }

    if (!isValidUrl(originalUrl)) {
      throw new ValidationError(
        "Invalid URL format. Must start with http:// or https://.",
      );
    }

    // Check danger URL

    const shortUrl = await generateShortLink(originalUrl, userId);

    ApiResponse.created(
      res,
      {
        shortUrl,
        originalUrl,
        createdAt: new Date().toISOString(),
      },
      "Short URL created successfully.",
    );
  } catch (error) {
    next(error);
  }
};

// Controller function to get paginated list of user's links
export const getLinksController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    // Parse optional pagination query params
    const rawLimit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;

    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const rawCursor = req.query.cursor as string | undefined;
    const cursor = rawCursor ? BigInt(rawCursor) : undefined;

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
export const getLinkInfoController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { shortCode } = req.params;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    if (typeof shortCode !== "string" || !shortCode) {
      throw new BadRequestError("Invalid short code.");
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
    getLinksController,
    getLinkInfoController,
}
