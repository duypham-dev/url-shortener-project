import crypto from 'crypto';

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Hàm này CHỈ nhận vào số ID (tự tăng) từ Database
export default function encodeIdToBase62(id: bigint): string {
  if (id === 0n) return BASE62_CHARS[0] ?? '0';

  let result = '';
  let num = id;
  const base = 62n; // Chuyển base sang bigint

  while (num > 0n) {
    const remainder = Number(num % base); // Lấy phần dư và ép kiểu về number để làm index
    result = (BASE62_CHARS[remainder] ?? '') + result;
    num = num / base; // Phép chia số nguyên của BigInt tự động bỏ phần thập phân
  }

  return result;
}

// export default async function generateShortLink(
//   longUrl: string,
//   userId?: number
// ): Promise<string> {
//   const BASE_URL = process.env.SHORT_LINK_BASE_URL ?? 'https://short.ly';

//   const code = generateCode(longUrl, userId);
//   return `${BASE_URL}/${code}`;
// }