import {prisma} from "../libs/prisma";

export async function saveLink(longUrl: string, shortCode: string, userId?: number) {
  try {
    await prisma.url_mappings.create({
        data: {
            long_url: longUrl,
            short_code: shortCode,
            user_id: userId ?? null,
        }
    })
  } catch (error) {
    console.error('Error saving link to database:', error);
    throw new Error('Failed to save link');
  }
}