import type { Request, Response } from "express";
import { prisma } from "../libs/prisma.js";

const getLinks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const links = await prisma.url_mappings.findMany({
      where: { user_id: Number(userId), is_active: true },
      orderBy: { created_at: "desc" },
      select: {
        short_code: true,
        long_url: true,
        title: true,
        created_at: true,
        click_count: true,
      },
    });

    res.status(200).json({ success: true, data: links });
  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).json({ success: false, message: "Failed to fetch links." });
  }
};

export default getLinks;
