/**
 * getLinks.controller.ts
 *
 * Refactor Notes:
 * - Phase 5: Replaced direct prisma.url_mappings.findMany() call with
 *   getUserLinks() from the service layer. Controller no longer imports Prisma.
 * - Phase 4: Replaced inline catch → res.status(500) with next(error)
 *   so all errors flow through the global errorHandler middleware.
 * - Phase 8: Standardized 401 to throw UnauthorizedError (flows through
 *   global errorHandler) instead of inline res.status(401).
 * - Phase 8: Added cursor-based pagination via ?limit=&cursor= query params.
 */
import type { Request, Response, NextFunction } from "express";
import { getUserLinks } from "../services/link.service.js";
import { UnauthorizedError } from "../errors/app.error.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const getLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export default getLinks;
