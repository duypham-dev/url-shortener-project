import { prisma } from "../libs/prisma";
import encodeIdToBase62 from '../utils/generateShortLink';


export default async function generateShortLink(
  longUrl: string,
  userId: number // Obligatory
): Promise<string> {
  const BASE_URL = process.env.SHORT_LINK_BASE_URL ?? 'https://short.ly';

  // Chạy Transaction để đảm bảo link luôn có code sau khi tạo
  const result = await prisma.$transaction(async (tx) => {
    // Bước 1: Tạo record mới (bỏ trống short_code)
    const newMapping = await tx.url_mappings.create({
      data: {
        long_url: longUrl,
        user_id: userId,
      },
    });

    // Bước 2: Sinh mã từ ID (BigInt) vừa nhận được
    const code = encodeIdToBase62(newMapping.id);
    console.log(`Generated code ${code} for URL ID ${newMapping.id}`);
    // Bước 3: Cập nhật mã đó vào record
    await tx.url_mappings.update({
      where: { id: newMapping.id },
      data: { short_code: code },
    });

    return code;
  });

  return `${BASE_URL}/${result}`;
}