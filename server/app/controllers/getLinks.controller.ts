import type { Request, Response, NextFunction } from "express";
import { getUserLinks } from "../services/link.service.js";
import { UnauthorizedError } from "../errors/app.error.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const getLinksController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export default getLinksController;
