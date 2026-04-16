/**
 * link.service.ts
 *
 * Refactor Notes:
 * - NEW FILE: Extracts DB and Kafka operations from getLinks.controller.ts
 *   and redirecLink.controller.ts into the service layer, restoring proper
 *   separation of concerns (controllers should not call Prisma/Kafka directly).
 * - getLongUrlByShortCode: uses select { long_url } only (was fetching all columns).
 * - publishClickEvent: moved pushMessage() from redirecLink.controller.ts.
 */
import { prisma } from "../libs/prisma";
import { producer } from "./kafka.service.js";
import { logger } from "../utils/logger";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export interface ClickEventMessage {
  shortCode: string;
  longUrl: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}

// ----------------------------------------------------------------
// Get all active links for a user (used by getLinks controller)
// ----------------------------------------------------------------
export const getUserLinks = async (userId: number) => {
  return prisma.url_mappings.findMany({
    where: { user_id: userId, is_active: true },
    orderBy: { created_at: "desc" },
    select: {
      short_code: true,
      long_url: true,
      title: true,
      created_at: true,
      click_count: true,
    },
  });
};

// ----------------------------------------------------------------
// Get a specific link's info by shortCode (used by getLinkInfo controller)
// ----------------------------------------------------------------
export const getLinkInfoByShortCode = async (shortCode: string, userId: number) => {
  return prisma.url_mappings.findFirst({
    where: { short_code: shortCode, user_id: userId, is_active: true },
    select: {
      short_code: true,
      long_url: true,
      title: true,
      created_at: true,
      click_count: true,
    },
  });
};

// ----------------------------------------------------------------
// Resolve a short code to its long URL (used by redirect controller)
// Only fetches the long_url column — no need for other fields.
// ----------------------------------------------------------------
export const getLongUrlByShortCode = async (shortCode: string): Promise<string | null> => {
  const record = await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { long_url: true },
  });

  return record?.long_url ?? null;
};

// ----------------------------------------------------------------
// Publish click event to Kafka for analytics processing
// ----------------------------------------------------------------
export const publishClickEvent = async (message: ClickEventMessage): Promise<void> => {
  try {
    logger.info("Sending click event to Kafka", { shortCode: message.shortCode });
    await producer.send({
      topic: "click-events",
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (error) {
    logger.error("Error sending click event to Kafka", { error });
  }
};
