import { prisma } from "../libs/prisma";

export interface AnalyticsBreakdownItem {
  label: string;
  clicks: number;
}

export interface LinkBreakdownAnalyticsResult {
  deviceBreakdown: AnalyticsBreakdownItem[];
  browserBreakdown: AnalyticsBreakdownItem[];
  osBreakdown: AnalyticsBreakdownItem[];
  countryBreakdown: AnalyticsBreakdownItem[];
}

export interface BreakdownQueryRow {
  dimension: string;
  label: string;
  clicks: bigint;
}

export const getLinkBreakdownAnalyticsRepo = async (shortCode: string): Promise<LinkBreakdownAnalyticsResult> => {
  const rows = await prisma.$queryRaw<BreakdownQueryRow[]>`
    WITH device_stats AS (
        SELECT 'device' as dimension, COALESCE(NULLIF(TRIM(device_type), ''), 'Unknown') AS label, COUNT(*)::bigint AS clicks FROM shortlink.click_logs WHERE short_code = ${shortCode} GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    ), browser_stats AS (
        SELECT 'browser' as dimension, COALESCE(NULLIF(TRIM(browser), ''), 'Unknown') AS label, COUNT(*)::bigint AS clicks FROM shortlink.click_logs WHERE short_code = ${shortCode} GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    ), os_stats AS (
        SELECT 'os' as dimension, COALESCE(NULLIF(TRIM(os), ''), 'Unknown') AS label, COUNT(*)::bigint AS clicks FROM shortlink.click_logs WHERE short_code = ${shortCode} GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    ), country_stats AS (
        SELECT 'country' as dimension, COALESCE(NULLIF(TRIM(country), ''), 'Unknown') AS label, COUNT(*)::bigint AS clicks FROM shortlink.click_logs WHERE short_code = ${shortCode} GROUP BY 2 ORDER BY 3 DESC LIMIT 8
    )
    SELECT * FROM device_stats 
    UNION ALL SELECT * FROM browser_stats 
    UNION ALL SELECT * FROM os_stats 
    UNION ALL SELECT * FROM country_stats
  `;

  const result: LinkBreakdownAnalyticsResult = {
    deviceBreakdown: [],
    browserBreakdown: [],
    osBreakdown: [],
    countryBreakdown: []
  };

  for (const row of rows) {
    const item = { label: row.label, clicks: Number(row.clicks) };
    if (row.dimension === 'device') result.deviceBreakdown.push(item);
    else if (row.dimension === 'browser') result.browserBreakdown.push(item);
    else if (row.dimension === 'os') result.osBreakdown.push(item);
    else if (row.dimension === 'country') result.countryBreakdown.push(item);
  }

  return result;
};

export const getClickLogsRepo = async (shortCode: string, take: number, skip: number) => {
  return await prisma.$transaction([
    prisma.click_logs.findMany({
      where: { short_code: shortCode },
      orderBy: { clicked_at: 'desc' },
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

export const getLinkReferrerAnalyticsRepo = async (shortCode: string) => {
  return await prisma.click_logs.groupBy({
    by: ['referrer'],
    where: { short_code: shortCode },
    _count: { referrer: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: 10,
  });
};

export const isLinkOwnedByUserRepo = async (shortCode: string) => {
  return await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { user_id: true },
  });
};

export const getDailyClickAnalyticsRepo = async (shortCode: string, since: Date) => {
  return await prisma.$queryRaw<{ date: Date; clicks: bigint }[]>`
    SELECT 
      DATE(clicked_at) as date,
      COUNT(*)::bigint as clicks
    FROM shortlink.click_logs
    WHERE short_code = ${shortCode}
      AND clicked_at >= ${since}
    GROUP BY DATE(clicked_at)
    ORDER BY date ASC
  `;
};
