import type { Request, Response } from "express";
import generateShortLink from "../utils/generateShortLink";
import { ApiResponse } from "../utils/response";
import { saveLink } from "../services/saveLink.service";

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
): Promise<void> => {

  const { originalUrl} = req.body;
  const userId = req.user?.userId || null;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (!originalUrl?.trim()) {
    res.status(400).json({ message: "URL is required." });
    return;
  }

  console.log("Received URL:", originalUrl, "from user:", userId);

  if (!isValidUrl(originalUrl)) {
    res
      .status(422)
      .json({
        message: "Invalid URL format. Must start with http:// or https://.",
      });
    return;
  }

  const shortUrl = await generateShortLink(originalUrl, userId);

  try {
    await saveLink(originalUrl, shortUrl.split("/").pop()!, userId);
  } catch (error) {
    res.status(500).json({ message: "Failed to save link." });
    return;
  }
  res.status(201).json({
    success: true,
    message: "Short URL created successfully.",
    data: {
      shortUrl,
      originalUrl,
      createdAt: new Date().toISOString(),
    },
  });
};

export default genShortLink;
