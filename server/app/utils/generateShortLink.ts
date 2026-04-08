import crypto from 'crypto';

const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHORT_CODE_LENGTH = 10;

function encodeBase62(num: bigint): string {
  if (num === 0n) return BASE62_CHARS[0] || 'a';

  let result = '';
  const base = BigInt(BASE62_CHARS.length);

  while (num > 0n) {
    result = BASE62_CHARS[Number(num % base)] + result;
    num /= base;
  }

  return result.padStart(SHORT_CODE_LENGTH, BASE62_CHARS[0] || 'a');
}

function generateCode(longUrl: string, userId?: number): string {
  const salt = `${longUrl}:${userId ?? 'anon'}:${Date.now()}`;
  const hash = crypto.createHash('sha256').update(salt).digest('hex');
  const num = BigInt(`0x${hash.slice(0, 16)}`);
  return encodeBase62(num).slice(0, SHORT_CODE_LENGTH);
}

export default async function generateShortLink(
  longUrl: string,
  userId?: number
): Promise<string> {
  const BASE_URL = process.env.SHORT_LINK_BASE_URL ?? 'https://short.ly';

  const code = generateCode(longUrl, userId);
  return `${BASE_URL}/${code}`;
}