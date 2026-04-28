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
import { producer, CLICK_EVENTS_TOPIC } from "./kafka.service.js";
import { logger } from "../utils/logger";
import {
  getUserLinksRepo,
  getLinkInfoByShortCodeRepo,
  getLongUrlByShortCodeRepo,
  getUrlOwnerContextRepo,
  type GetUserLinksOptions,
} from "../repositories/link.repo";

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
  interactionType: 'CLICK' | 'SCAN';
}

export interface ClickEventMessage extends ClickTrackInput {
  urlMappingId: string;
  userId: number;
  browser: string | null;
  os: string | null;
  deviceType: string;
  // interactionType is inherited from ClickTrackInput
}

export interface UserLinkSummary {
  id: string;           // base-10 string of the BigInt PK — used as cursor
  short_code: string | null;
  long_url: string;
  title: string | null;
  has_qr: boolean;
  created_at: Date | null;
  click_count: number;
}

/** Single-link detail payload returned by GET /links/:shortCode. */
export interface LinkInfoSummary {
  id: string;
  short_code: string | null;
  long_url: string;
  title: string | null;
  has_qr: boolean;
  created_at: Date | null;
  click_count: number;
}

export interface GetUserLinksResult {
  links: UserLinkSummary[];
  hasNextPage: boolean;
  nextCursor: string | null;
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

// ----------------------------------------------------------------
// Get paginated active links for a user (used by getLinks controller)
// ----------------------------------------------------------------
export const getUserLinks = async (
  userId: number,
  options: GetUserLinksOptions = {},
): Promise<GetUserLinksResult> => {
  const { limit } = options;
  const rows = await getUserLinksRepo(userId, options);

  const hasNextPage = limit !== undefined && rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;

  const links = items.map(({ id, _count, ...link }) => ({
    id: id.toString(),
    ...link,
    click_count: _count.click_logs,
  }));

  const nextCursor =
    hasNextPage && items.length > 0
      ? items.at(-1)?.id.toString() ?? null
      : null;

  return { links, hasNextPage, nextCursor };
};

// ----------------------------------------------------------------
// Get a specific link's info by shortCode (used by getLinkInfo controller)
// ----------------------------------------------------------------
export const getLinkInfoByShortCode = async (
  shortCode: string,
  userId: number,
): Promise<LinkInfoSummary | null> => {
  const link = await getLinkInfoByShortCodeRepo(shortCode, userId);

  if (!link) {
    return null;
  }

  return {
    id: link.id.toString(),
    short_code: link.short_code,
    long_url: link.long_url,
    title: link.title,
    has_qr: link.has_qr,
    created_at: link.created_at,
    click_count: link._count.click_logs,
  };
};

// ----------------------------------------------------------------
// Resolve a short code to its long URL (used by redirect controller)
// Only fetches the long_url column — no need for other fields.
// ----------------------------------------------------------------
export const getLongUrlByShortCode = async (shortCode: string): Promise<{ longUrl: string; hasActiveQr: boolean } | null> => {
  const record = await getLongUrlByShortCodeRepo(shortCode);

  if (!record) {
    return null;
  }

  return {
    longUrl: record.long_url,
    hasActiveQr: record.has_qr,
  };
};

// ----------------------------------------------------------------
// Publish click event to Kafka for analytics processing.
// Fire-and-forget: errors are logged but never propagated to the
// caller — a Kafka failure must NOT break the redirect response.
// ----------------------------------------------------------------
export const publishClickEvent = async (message: ClickTrackInput): Promise<void> => {
  try {
    logger.info('Kafka: publishing click event', { shortCode: message.shortCode });

    const ownerContext = await getUrlOwnerContextRepo(message.shortCode);
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
