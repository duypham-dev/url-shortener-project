import type { Request, Response, NextFunction } from "express";
import { getLinkInfoByShortCode } from "../services/link.service.js";

const getLinkInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { shortCode } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    if (typeof shortCode !== 'string' || !shortCode) {
      res.status(400).json({ success: false, message: "Invalid short code." });
      return;
    }

    const link = await getLinkInfoByShortCode(shortCode, userId);

    if (!link) {
      res.status(404).json({ success: false, message: "Link not found." });
      return;
    }

    res.status(200).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
};

export default getLinkInfo;
