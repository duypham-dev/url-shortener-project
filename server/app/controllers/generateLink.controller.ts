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

import {
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from "../errors/app.error.js";

interface ShortenRequestBody {
  originalUrl: string;
  userId?: number;
}

interface ShortenResponseBody {
  shortUrl: string;
  originalUrl: string;
}

const URL_REGEX = /^https?:\/\/.{1,2048}$/;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) && URL_REGEX.test(url);
  } catch {
    return false;
  }
}

const genShortLink = async (
  req: Request<{}, ShortenResponseBody, ShortenRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { originalUrl } = req.body;
    const userId = req.user?.userId || null;

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

export default genShortLink;
