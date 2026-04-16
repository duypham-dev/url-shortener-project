/**
 * getLinks.controller.ts
 *
 * Refactor Notes:
 * - Phase 5: Replaced direct prisma.url_mappings.findMany() call with
 *   getUserLinks() from the service layer. Controller no longer imports Prisma.
 * - Phase 4: Replaced inline catch → res.status(500) with next(error)
 *   so all errors flow through the global errorHandler middleware.
 */
import type { Request, Response, NextFunction } from "express";
import { getUserLinks } from "../services/link.service.js";

const getLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const links = await getUserLinks(userId);

    res.status(200).json({ success: true, data: links });
  } catch (error) {
    next(error);
  }
};

export default getLinks;
