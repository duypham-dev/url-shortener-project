import { prisma } from "../libs/prisma";

export async function saveLink(longUrl: string, shortCode: string, userId: number, title: string | null = null) {
  await prisma.url_mappings.create({
    data: {
      long_url: longUrl,
      short_code: shortCode,
      user_id: userId,
      title: title,
    },
  });
}