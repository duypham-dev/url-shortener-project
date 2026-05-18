/**
 * link.service.ts
 *
 * Refactor Notes:
 * - NEW FILE: Extracts DB operations from getLinks.controller.ts
 *   and redirecLink.controller.ts into the service layer, restoring proper
 *   separation of concerns (controllers should not call Prisma/BullMQ directly).
 * - getLongUrlByShortCode: uses select { long_url } only (was fetching all columns).
 * - publishClickEvent: moved pushMessage() from redirecLink.controller.ts.
 */
import { UAParser } from 'ua-parser-js';
import { clickQueue } from './queue.service.js';
import { logger } from "../utils/logger";
import {
  getUserLinksRepo,
  getLinkInfoByShortCodeRepo,
  getLongUrlByShortCodeRepo,
  getUrlOwnerContextRepo,
  updateLinkRepo,
  shortCodeExistsRepo,
  incrementCustomLinkUsageRepo,
  type GetUserLinksOptions,
} from "../repositories/link.repo";
import { ConflictError } from "../errors/app.error.js";
import { prisma } from "../libs/prisma.js";

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

  const links = items.map(({ id, click_count, ...link }) => ({
    id: id.toString(),
    ...link,
    click_count: Number(click_count),
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
    click_count: Number(link.click_count),
  };
};

// ----------------------------------------------------------------
// Resolve a short code to its long URL (used by redirect controller)
// Only fetches the long_url column — no need for other fields.
// ----------------------------------------------------------------
export const getLongUrlByShortCode = async (
  shortCode: string,
): Promise<{ longUrl: string; hasActiveQr: boolean; expiresAt: Date | null } | null> => {
  const record = await getLongUrlByShortCodeRepo(shortCode);

  if (!record) {
    return null;
  }

  return {
    longUrl: record.long_url,
    hasActiveQr: record.has_qr,
    expiresAt: record.expires_at ?? null,
  };
};

// ----------------------------------------------------------------
// Publish click event to BullMQ for analytics processing.
// Fire-and-forget: errors are logged but never propagated to the
// caller — a queue failure must NOT break the redirect response.
// ----------------------------------------------------------------
export const publishClickEvent = async (message: ClickTrackInput): Promise<void> => {
  try {
    const ownerContext = await getUrlOwnerContextRepo(message.shortCode);
    if (!ownerContext) {
      logger.warn('BullMQ: skipped click event because shortCode was not found.', {
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

    await clickQueue.add('click', payload, { priority: 1 });
    logger.info('BullMQ: click event queued', { shortCode: message.shortCode });
  } catch (error) {
    logger.error('BullMQ: failed to queue click event', { error });
  }
};

// ----------------------------------------------------------------
// Update a specific link's data (e.g. title)
// ----------------------------------------------------------------
export const updateLink = async (
  shortCode: string,
  userId: number,
  data: { title?: string },
): Promise<void> => {
  await updateLinkRepo(shortCode, userId, data);
};

// ----------------------------------------------------------------
// Create a short link with a custom alias (Phase 5)
// Skips base62 encoding — uses the alias directly.
// Throws ConflictError (409) if the alias is already taken.
// ----------------------------------------------------------------
export interface CreateCustomAliasResult {
  shortUrl: string;
  shortCode: string;
  urlMappingId: bigint;
}

export const createCustomAliasLink = async (
  longUrl: string,
  userId: number,
  customAlias: string,
  expiresAt?: Date | null,
  title?: string,
): Promise<CreateCustomAliasResult> => {
  const BASE_URL = process.env.SHORT_LINK_BASE_URL ?? 'https://short.ly';

  // Uniqueness check (includes inactive / deleted records to avoid recycling)
  const taken = await shortCodeExistsRepo(customAlias);
  if (taken) {
    throw new ConflictError(
      `The alias "${customAlias}" is already taken. Please choose a different back-half.`,
    );
  }

  const newMapping = await prisma.url_mappings.create({
    data: {
      long_url: longUrl,
      user_id: userId,
      short_code: customAlias,
      is_custom: true,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      ...(title ? { title } : {}),
    },
  });

  // Track monthly custom-link usage
  const yearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  await incrementCustomLinkUsageRepo(userId, yearMonth);

  return {
    shortUrl: `${BASE_URL}/${customAlias}`,
    shortCode: customAlias,
    urlMappingId: newMapping.id,
  };
};
