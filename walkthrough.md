# Walkthrough: Analytics Endpoint Refactoring

## Summary

Split the monolithic `GET /api/v1/links/:shortCode/analytics` endpoint (which executed all analytics queries in parallel and returned one large payload) into a **query-parameter-dispatched design** where the `groupBy` param selects which analytics dimension to fetch. The frontend now issues **independent requests per dimension**, enabling **progressive rendering**.

---

## Backend Changes

### [NEW] [analytics.schema.ts](file:///d:/Workspace/URLShortener/server/app/schemas/analytics.schema.ts)
Zod v4 schema validating `shortCode` (params) + `groupBy`, `start`, `end`, `timezone` (query). Defaults: 30 days ago → now, UTC timezone.

### [MODIFY] [analytics.repo.ts](file:///d:/Workspace/URLShortener/server/app/repositories/analytics.repo.ts)
Replaced monolithic `getLinkBreakdownAnalyticsRepo` + `getDailyClickAnalyticsRepo` + `getLinkReferrerAnalyticsRepo` with five standalone functions:

| Function | Purpose |
|---|---|
| `getTimeseriesRepo` | Daily clicks with `AT TIME ZONE` support |
| `getReferrersRepo` | Prisma `groupBy` on referrer with date filter |
| `getCountriesRepo` | Raw SQL country breakdown with date filter |
| `getDevicesRepo` | CTE for device/browser/OS (country removed) |
| `getTopLinksRepo` | **New** — top links by click count for a user |

All functions accept `start`/`end` date range parameters. Preserved: `isLinkOwnedByUserRepo`, `getClickLogsRepo`.

### [MODIFY] [analytics.service.ts](file:///d:/Workspace/URLShortener/server/app/services/analytics.service.ts)
Matching per-dimension service functions. Each maps raw DB rows to typed DTOs. Preserved: `isLinkOwnedByUser`, `getClickLogs`.

### [MODIFY] [analytics.controller.ts](file:///d:/Workspace/URLShortener/server/app/controllers/analytics.controller.ts)
Replaced `getLinkAnalytics` with `getGroupedLinkAnalytics` — dispatches to the correct service via `switch(groupBy)`. Skips link ownership check for `top_links`. Returns `{ success: true, data: { groupBy, items } }`.

### [MODIFY] [shortlink.route.ts](file:///d:/Workspace/URLShortener/server/app/routes/shortlink.route.ts)
Updated import and route registration to use `analyticsQuerySchema` + `getGroupedLinkAnalytics`.

---

## Frontend Changes

### [MODIFY] [analytics.type.ts](file:///d:/Workspace/URLShortener/frontend/src/types/analytics.type.ts)
Added per-dimension types: `TimeseriesItem`, `ReferrerItem`, `DeviceBreakdown`, `TopLinkItem`, `AnalyticsQueryParams`. Preserved legacy types for backward compatibility.

### [MODIFY] [analytics.api.ts](file:///d:/Workspace/URLShortener/frontend/src/api/analytics.api.ts)
Five granular API functions (`getLinkAnalyticsTimeseries`, `...Referrers`, `...Countries`, `...Devices`, `...TopLinks`), each calling the same route with a different `groupBy` param.

### [MODIFY] [useLinkAnalyticsData.ts](file:///d:/Workspace/URLShortener/frontend/src/hooks/useLinkAnalyticsData.ts)
Replaced single `useQuery` with **four independent** `useQuery` calls (timeseries, referrers, countries, devices). Returns granular data instead of monolithic `analytics` object. `isLoading` now only tracks link info query.

### [MODIFY] [LinkAnalytics.tsx](file:///d:/Workspace/URLShortener/frontend/src/pages/LinkAnalytics.tsx)
Consumes new hook shape (`timeseries`, `referrers`, `countries`, `devices`). Summary stats computed from `timeseries`. Each card can load independently.

---

## Verification

- **TypeScript compilation**: ✅ Both `server/` and `frontend/` pass `tsc --noEmit` with zero errors
- **No stale references**: Verified no remaining imports of removed functions
