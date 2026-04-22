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
}

interface ShortenResponseBody {
  shortUrl: string;
  originalUrl: string;
}

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
const genShortLink = async (
  req: Request<{}, ShortenResponseBody, ShortenRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { originalUrl } = req.body;
    
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

export default genShortLink;
