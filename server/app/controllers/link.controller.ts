import type { NextFunction, Request, Response } from "express";
import generateShortLink from "../services/generateLink.service.js";
import {
  getLinkInfoByShortCode,
  updateLink,
  createCustomAliasLink,
} from "../services/link.service.js";
import { getUserLinks } from "../services/link.service.js";
import { createQrCodeForLink } from "../services/qrCode.service.js";
import { assertCanCreateLink } from "../services/subscriptionAccess.service.js";

import {
  NotFoundError,
  UnauthorizedError,
} from "../errors/app.error.js";


interface ShortenRequestBody {
  originalUrl: string;
  generateQr?: boolean;
  qrOptions?: {
    fgColor?: string;
    bgColor?: string;
  };
  /** Phase 5 — optional custom back-half for the short URL */
  customAlias?: string;
  /** Phase 4 — optional expiry date (ISO string); null = no expiry */
  expiresAt?: string | null;
  title?: string;
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
    const { originalUrl, generateQr = false, qrOptions, customAlias, expiresAt, title } = req.body;
    // Get userId from auth middleware
    const userId = req.user?.userId ?? null;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

    let shortUrl: string;
    let shortCode: string;
    let urlMappingId: bigint;

    if (customAlias) {
      // ── Phase 5: custom alias path ───────────────────────────────────────
      // Enforce the user's custom-link quota (isCustom: true)
      await assertCanCreateLink({ userId, isCustom: true, generateQr });

      const result = await createCustomAliasLink(
        originalUrl,
        userId,
        customAlias,
        parsedExpiresAt,
        title,
      );
      shortUrl = result.shortUrl;
      shortCode = result.shortCode;
      urlMappingId = result.urlMappingId;
    } else {
      // ── Standard base62 path ─────────────────────────────────────────────
      await assertCanCreateLink({ userId, isCustom: false, generateQr });

      const result = await generateShortLink(originalUrl, userId, parsedExpiresAt, title);
      shortUrl = result.shortUrl;
      shortCode = result.shortCode;
      urlMappingId = result.urlMappingId;
    }

    // Optionally create a linked QR code (fire-and-forget on failure)
    let qrCode = null;
    if (generateQr) {
      qrCode = await createQrCodeForLink({
        destinationUrl: shortUrl,
        urlMappingId,
        shortCode,
        userId,
        ...(qrOptions?.fgColor ? { fgColor: qrOptions.fgColor } : {}),
        ...(qrOptions?.bgColor ? { bgColor: qrOptions.bgColor } : {}),
      });
    }

    res.status(201).json({
      success: true,
      message: "Short URL created successfully.",
      data: {
        shortUrl,
        originalUrl,
        createdAt: new Date().toISOString(),
        ...(parsedExpiresAt ? { expiresAt: parsedExpiresAt.toISOString() } : {}),
        ...(qrCode ? { qrCode } : {}),
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
    const search = req.query.search as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;

    const { links, hasNextPage, nextCursor } = await getUserLinks(userId, {
      limit,
      ...(cursor !== undefined ? { cursor } : {}),
      ...(search !== undefined ? { search } : {}),
      ...(startDate !== undefined ? { startDate } : {}),
      ...(endDate !== undefined ? { endDate } : {}),
      ...(sortBy !== undefined ? { sortBy } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
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

// Controller function to update link info
export const updateLinkHandler = async (
  req: Request<{ shortCode: string }, {}, { title?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { shortCode } = req.params;
    const { title } = req.body;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized.");
    }

    await updateLink(shortCode, userId, { ...(title !== undefined && { title }) });

    res.status(200).json({ success: true, message: "Link updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const linkController = {
    genShortLink,
    getLinksList,
    getLinkInfor,
    updateLinkHandler,
}
