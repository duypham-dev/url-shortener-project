import { prisma } from "../libs/prisma";
import encodeIdToBase62 from '../utils/generateShortLink';

export interface GenerateLinkResult {
  shortUrl: string;
  shortCode: string;
  urlMappingId: bigint;
}

export default async function generateShortLink(
  longUrl: string,
  userId: number // Obligatory
): Promise<GenerateLinkResult> {
  const BASE_URL = process.env.SHORT_LINK_BASE_URL ?? 'https://short.ly';

  // Use a transaction to ensure atomicity of the two steps: creating the record and updating it with the code
  const result = await prisma.$transaction(async (tx) => {
    // Create a new URL mapping record with the long URL and user ID. 
    // The short_code will be generated after we get the ID.
    const newMapping = await tx.url_mappings.create({
      data: {
        long_url: longUrl,
        user_id: userId,
      },
    });

    // Create the short code based on the new record's ID
    const code = encodeIdToBase62(newMapping.id);
    console.log(`Generated code ${code} for URL ID ${newMapping.id}`);
    // Update the record with the generated short code
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