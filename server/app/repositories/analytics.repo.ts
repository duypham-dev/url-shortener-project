import { prisma } from "../libs/prisma";
import type {
  BreakdownRawRow,
  TopLinkRawRow,
} from "../types/analytics.type.js";

// ----------------------------------------------------------------
// Timeseries — aggregate clicks in the DB (not in Node.js memory)
// ----------------------------------------------------------------

export interface TimeseriesRawRow {
  bucket: Date;
  clicks: bigint;
}

/**
 * Aggregate clicks by hour directly in PostgreSQL.
 * Returns pre-bucketed rows — no in-memory grouping needed.
 */
export const getTimeseriesHourlyRepo = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<TimeseriesRawRow[]> => {
  return prisma.$queryRaw<TimeseriesRawRow[]>`
    SELECT DATE_TRUNC('hour', clicked_at AT TIME ZONE 'UTC') AS bucket,
           COUNT(*)::bigint AS clicks
    FROM shortlink.click_logs
    WHERE short_code = ${shortCode}
      AND clicked_at >= ${new Date(start)}
      AND clicked_at <= ${new Date(end)}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
};

/**
 * Aggregate clicks by day directly in PostgreSQL.
 * Returns pre-bucketed rows — no in-memory grouping needed.
 */
export const getTimeseriesDailyRepo = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<TimeseriesRawRow[]> => {
  return prisma.$queryRaw<TimeseriesRawRow[]>`
    SELECT DATE_TRUNC('day', clicked_at AT TIME ZONE 'UTC') AS bucket,
           COUNT(*)::bigint AS clicks
    FROM shortlink.click_logs
    WHERE short_code = ${shortCode}
      AND clicked_at >= ${new Date(start)}
      AND clicked_at <= ${new Date(end)}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
};

// ----------------------------------------------------------------
// Referrers — top referrer sources
// ----------------------------------------------------------------

/**
 * Get referrer breakdown for a given short code within a date range.
 */
export const getReferrersRepo = async (
  shortCode: string,
  start: string,
  end: string,
) => {
  return prisma.click_logs.groupBy({
    by: ["referrer"],
    where: {
      short_code: shortCode,
      clicked_at: {
        gte: new Date(start),
        lte: new Date(end),
      },
    },
    _count: { referrer: true },
    orderBy: { _count: { referrer: "desc" } },
    take: 10,
  });
};

// ----------------------------------------------------------------
// Countries — top countries by click count
// ----------------------------------------------------------------

/**
 * Get country breakdown for a given short code within a date range.
 */
export const getCountriesRepo = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<BreakdownRawRow[]> => {
  return prisma.$queryRaw<BreakdownRawRow[]>`
    SELECT
      'country' AS dimension,
      COALESCE(NULLIF(TRIM(country), ''), 'Unknown') AS label,
      COUNT(*)::bigint AS clicks
    FROM shortlink.click_logs
    WHERE short_code = ${shortCode}
      AND clicked_at >= ${new Date(start)}
      AND clicked_at <= ${new Date(end)}
    GROUP BY 2
    ORDER BY 3 DESC
    LIMIT 8
  `;
};

// ----------------------------------------------------------------
// Devices — device type, browser, and OS breakdowns
// ----------------------------------------------------------------

/**
 * Get device/browser/OS breakdown using a CTE for a given short code and date range.
 */
export const getDevicesRepo = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<BreakdownRawRow[]> => {
  return prisma.$queryRaw<BreakdownRawRow[]>`
    WITH device_stats AS (
      SELECT 'device' AS dimension,
             COALESCE(NULLIF(TRIM(device_type), ''), 'Unknown') AS label,
             COUNT(*)::bigint AS clicks
      FROM shortlink.click_logs
      WHERE short_code = ${shortCode}
        AND clicked_at >= ${new Date(start)}
        AND clicked_at <= ${new Date(end)}
      GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    ), browser_stats AS (
      SELECT 'browser' AS dimension,
             COALESCE(NULLIF(TRIM(browser), ''), 'Unknown') AS label,
             COUNT(*)::bigint AS clicks
      FROM shortlink.click_logs
      WHERE short_code = ${shortCode}
        AND clicked_at >= ${new Date(start)}
        AND clicked_at <= ${new Date(end)}
      GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    ), os_stats AS (
      SELECT 'os' AS dimension,
             COALESCE(NULLIF(TRIM(os), ''), 'Unknown') AS label,
             COUNT(*)::bigint AS clicks
      FROM shortlink.click_logs
      WHERE short_code = ${shortCode}
        AND clicked_at >= ${new Date(start)}
        AND clicked_at <= ${new Date(end)}
      GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    )
    SELECT * FROM device_stats
    UNION ALL SELECT * FROM browser_stats
    UNION ALL SELECT * FROM os_stats
  `;
};

// ----------------------------------------------------------------
// Top Links — most clicked links for a user
// ----------------------------------------------------------------

/**
 * Get top-performing links for a user within a date range.
 * Joins url_mappings → click_logs and groups by short_code.
 */
export const getTopLinksRepo = async (
  userId: number,
  start: string,
  end: string,
): Promise<TopLinkRawRow[]> => {
  return prisma.$queryRaw<TopLinkRawRow[]>`
    SELECT
      um.short_code,
      um.long_url,
      COUNT(cl.id)::bigint AS clicks
    FROM shortlink.url_mappings um
    JOIN shortlink.click_logs cl ON cl.short_code = um.short_code
    WHERE um.user_id = ${userId}
      AND cl.clicked_at >= ${new Date(start)}
      AND cl.clicked_at <= ${new Date(end)}
    GROUP BY um.short_code, um.long_url
    ORDER BY clicks DESC
    LIMIT 10
  `;
};

// ----------------------------------------------------------------
// Preserved functions (unchanged)
// ----------------------------------------------------------------

/**
 * Check whether a link is owned by a specific user.
 */
export const isLinkOwnedByUserRepo = async (shortCode: string) => {
  return prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { user_id: true },
  });
};

/**
 * Get paginated click logs for a specific link.
 */
export const getClickLogsRepo = async (
  shortCode: string,
  take: number,
  skip: number,
) => {
  return prisma.$transaction([
    prisma.click_logs.findMany({
      where: { short_code: shortCode },
      orderBy: { clicked_at: "desc" },
      take,
      skip,
      select: {
        id: true,
        url_mapping_id: true,
        user_id: true,
        clicked_at: true,
        ip_address: true,
        browser: true,
        os: true,
        device_type: true,
        user_agent: true,
        referrer: true,
        country: true,
      },
    }),
    prisma.click_logs.count({ where: { short_code: shortCode } }),
  ]);
};
