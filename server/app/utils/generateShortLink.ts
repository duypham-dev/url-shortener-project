
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Convert a bigint ID to a base62 string for short link generation
export default function encodeIdToBase62(id: bigint): string {
  if (id === 0n) return BASE62_CHARS[0] ?? '0';

  let result = '';
  let num = id;
  const base = 62n; // Transform to BigInt for calculations

  while (num > 0n) {
    const remainder = Number(num % base); // Get the remainder as a regular number to index into the string
    result = (BASE62_CHARS[remainder] ?? '') + result;
    num = num / base; // Integer division by base
  }

  return result;
}
