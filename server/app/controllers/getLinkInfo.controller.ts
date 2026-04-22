import type { Request, Response, NextFunction } from "express";
import { getLinkInfoByShortCode } from "../services/link.service.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/app.error.js";

const getLinkInfoController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export default getLinkInfoController;
