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
import { UAParser } from 'ua-parser-js';
import { prisma } from "../libs/prisma";
import { producer, CLICK_EVENTS_TOPIC } from "./kafka.service.js";
import { logger } from "../utils/logger";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export interface ClickTrackInput {
  shortCode: string;
  longUrl: string;
  ip: string;
  userAgent: string;
  referrer: string | null;
  timestamp: string;
}

export interface ClickEventMessage extends ClickTrackInput {
  urlMappingId: string;
  userId: number;
  browser: string | null;
  os: string | null;
  deviceType: string;
}

export interface UserLinkSummary {
  short_code: string | null;
  long_url: string;
  title: string | null;
  created_at: Date | null;
  click_count: number;
}

type UserAgentDetails = {
  browser: string | null;
  os: string | null;
  deviceType: string;
};

const parseUserAgent = (userAgent: string): UserAgentDetails => {
  const parsed = new UAParser(userAgent).getResult();

  return {
    browser: parsed.browser.name ?? null,
    os: parsed.os.name ?? null,
    deviceType: parsed.device.type ?? 'desktop',
  };
};

const getUrlOwnerContext = async (shortCode: string) => {
  return prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: {
      id: true,
      user_id: true,
    },
  });
};

// ----------------------------------------------------------------
// Get all active links for a user (used by getLinks controller)
// ----------------------------------------------------------------
export const getUserLinks = async (userId: number): Promise<UserLinkSummary[]> => {
  const links = await prisma.url_mappings.findMany({
    where: { user_id: userId, is_active: true },
    orderBy: { created_at: "desc" },
    select: {
      short_code: true,
      long_url: true,
      title: true,
      created_at: true,
      _count: {
        select: {
          click_logs: true,
        },
      },
    },
  });

  return links.map(({ _count, ...link }) => ({
    ...link,
    click_count: _count.click_logs,
  }));
};

// ----------------------------------------------------------------
// Get a specific link's info by shortCode (used by getLinkInfo controller)
// ----------------------------------------------------------------
export const getLinkInfoByShortCode = async (
  shortCode: string,
  userId: number,
): Promise<UserLinkSummary | null> => {
  const link = await prisma.url_mappings.findFirst({
    where: { short_code: shortCode, user_id: userId, is_active: true },
    select: {
      short_code: true,
      long_url: true,
      title: true,
      created_at: true,
      _count: {
        select: {
          click_logs: true,
        },
      },
    },
  });

  if (!link) {
    return null;
  }

  return {
    short_code: link.short_code,
    long_url: link.long_url,
    title: link.title,
    created_at: link.created_at,
    click_count: link._count.click_logs,
  };
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
// Publish click event to Kafka for analytics processing.
// Fire-and-forget: errors are logged but never propagated to the
// caller — a Kafka failure must NOT break the redirect response.
// ----------------------------------------------------------------
export const publishClickEvent = async (message: ClickTrackInput): Promise<void> => {
  try {
    logger.info('Kafka: publishing click event', { shortCode: message.shortCode });

    const ownerContext = await getUrlOwnerContext(message.shortCode);
    if (!ownerContext) {
      logger.warn('Kafka: skipped click event because shortCode was not found.', {
        shortCode: message.shortCode,
      });
      return;
    }

    const userAgentDetails = parseUserAgent(message.userAgent);

    const payload: ClickEventMessage = {
      ...message,
      urlMappingId: ownerContext.id.toString(),
      userId: ownerContext.user_id,
      browser: userAgentDetails.browser,
      os: userAgentDetails.os,
      deviceType: userAgentDetails.deviceType,
    };

    await producer.send({
      topic: CLICK_EVENTS_TOPIC,
      messages: [{ value: JSON.stringify(payload) }],
    });
  } catch (error) {
    logger.error('Kafka: failed to publish click event', { error });
  }
};
