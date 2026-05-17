/**
 * generateLink.service.ts
 *
 * Generates a short code using a BigInt-to-base62 encoding strategy.
 *
 * Phase 4 update: accepts an optional `expiresAt` date that is persisted
 * to url_mappings.expires_at when provided.
 */
import { prisma } from "../libs/prisma";
import encodeIdToBase62 from '../utils/generateShortLink';

export interface GenerateLinkResult {
  shortUrl: string;
  shortCode: string;
  urlMappingId: bigint;
}

export default async function generateShortLink(
  longUrl: string,
  userId: number,
  expiresAt?: Date | null,
  title?: string,
): Promise<GenerateLinkResult> {
  const BASE_URL = process.env.SHORT_LINK_BASE_URL ?? 'https://short.ly';

  const result = await prisma.$transaction(async (tx) => {
    const newMapping = await tx.url_mappings.create({
      data: {
        long_url: longUrl,
        user_id: userId,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
        ...(title ? { title } : {}),
      },
    });

    const code = encodeIdToBase62(newMapping.id);

    await tx.url_mappings.update({
      where: { id: newMapping.id },
      data: { short_code: code },
    });

    return { shortCode: code, urlMappingId: newMapping.id };
  });

  return {
    shortUrl: `${BASE_URL}/${result.shortCode}`,
    shortCode: result.shortCode,
    urlMappingId: result.urlMappingId,
  };
}