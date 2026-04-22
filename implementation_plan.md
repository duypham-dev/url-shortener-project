# Refactoring URLShortener Codebase

This implementation plan outlines the required changes to address critical security, performance, and maintainability gaps identified in the project audit.

## User Review Required

> [!WARNING]
> **Dependencies update required on the frontend**: I will install `@tanstack/react-query` to manage client-side state cleanly across components, removing custom implementation boilerplate. Please confirm if this is acceptable.
> 
> **Architecture Split**: Refactoring business logic and queries into the `Repository Layer` introduces a major structural change in the backend. 

## Proposed Changes

---

### Backend: Redis Rate Limit & Cache Improvements

**Goal:** Eliminate bounded Redis memory leak and atomic race conditions in the `redirect` hot path.

#### [MODIFY] [redirecLink.controller.ts](file:///d:/Workspace/URLShortener/server/app/controllers/redirecLink.controller.ts)
- **Fix Unbounded `unique_clicks` Growth:** Add conditional `redis.expire(uniqueIpKey, 86400)` when `isUnique === 1`.
- **Eliminate check-then-set race condition:** Use an atomic `redis.multi()` block (or a `Lua` script inside the function) for `INCR` and `EXPIRE` so they resolve automatically under high concurrency. 

---

### Backend: Folder Restructuring (Repositories & Jobs)

**Goal:** Segregate database access logic from core business logic (Service Layer) & establish dedicated job workers for crons.

#### [NEW] [link.repo.ts](file:///d:/Workspace/URLShortener/server/app/repositories/link.repo.ts)
- Create new pure DB access repository for link models.

#### [NEW] [analytics.repo.ts](file:///d:/Workspace/URLShortener/server/app/repositories/analytics.repo.ts)
- Create new pure DB access repository for analytics DB tracking.

#### [NEW] [subscription.repo.ts](file:///d:/Workspace/URLShortener/server/app/repositories/subscription.repo.ts)
- Create new pure DB access repository for subscription plans and logic.

#### [NEW] [expireSubscriptions.job.ts](file:///d:/Workspace/URLShortener/server/app/jobs/expireSubscriptions.job.ts)
- Move `syncExpiredSubscriptions` logic from `getActivePlanContext` into a scheduled cron expression. This will remove a write query nested deeply inside a heavily read hot path.

#### [MODIFY] [subscriptionAccess.service.ts](file:///d:/Workspace/URLShortener/server/app/services/subscriptionAccess.service.ts)
#### [MODIFY] [link.service.ts](file:///d:/Workspace/URLShortener/server/app/services/link.service.ts)
#### [MODIFY] [analytics.service.ts](file:///d:/Workspace/URLShortener/server/app/services/analytics.service.ts)
- Refactor the code to consume repositories where applicable.

---

### Backend: 6-Query Analytics Problem

**Goal:** Consolidate breakdown queries (`device`, `browser`, `os`, `country`) into a single CTE query in the new Analytics Repository.

#### [MODIFY] [analytics.service.ts](file:///d:/Workspace/URLShortener/server/app/services/analytics.service.ts) (which will be moved to `analytics.repo.ts`)
- Define a single aggregate Prisma raw query substituting the `Promise.all` logic previously doing `getLinkBreakdownByDimension`.
```sql
WITH device_stats AS (
    SELECT 'device' as dimension, COALESCE(NULLIF(TRIM(device_type), ''), 'Unknown') AS label, COUNT(*)::bigint AS clicks FROM shortlink.click_logs WHERE short_code = $1 GROUP BY 2 ORDER BY 3 DESC LIMIT 8
), browser_stats AS (
    SELECT 'browser' as dimension, COALESCE(NULLIF(TRIM(browser), ''), 'Unknown') AS label, COUNT(*)::bigint AS clicks FROM shortlink.click_logs WHERE short_code = $1 GROUP BY 2 ORDER BY 3 DESC LIMIT 8
),
... 
SELECT * FROM device_stats UNION ALL SELECT * FROM browser_stats ...
```

---

### Frontend: React Query for Data Fetching & Caching

**Goal:** Fix module-layer cache logic which ignores React lifecycles and survives logouts, serving stale data.

#### [MODIFY] [package.json](file:///d:/Workspace/URLShortener/frontend/package.json)
- Add `@tanstack/react-query`.

#### [MODIFY] [App.tsx](file:///d:/Workspace/URLShortener/frontend/src/App.tsx)
- Add `QueryClientProvider` around the app structure with `QueryClient`.

#### [MODIFY] [useLinks.ts](file:///d:/Workspace/URLShortener/frontend/src/hooks/useLinks.ts)
#### [MODIFY] [useLinkAnalyticsData.ts](file:///d:/Workspace/URLShortener/frontend/src/hooks/useLinkAnalyticsData.ts)
- Delete manual `linkInfoCache`, `analyticsCache`, `isCacheFresh` boilerplate.
- Replace it natively using `useQuery({ queryKey: [...], queryFn: ... })`.
- Ensure standard `staleTime` behavior applies accurately, solving the logout-relogin bug passively entirely by design.

## Open Questions

> [!IMPORTANT]
> - Do you want me to write an orchestrator `index.ts` to `start()` the expiry Cron job alongside the main backend server, or do you have a specific runner you use for jobs?
> - Can I install `@tanstack/react-query` to solve the module-level caching bugs on the frontend?

## Verification Plan

### Automated Tests
- Validate new backend structures compile using `npx tsc --noEmit`. 
- Restart the backend to confirm initialization succeeds.

### Manual Verification
- Login to the frontend and access the dashboard. Verify `useLinks` properly utilizes caching without errors.
- Create multiple URL clicks with identical/different IPs to ensure `redirecLink` logs without errors. Ensure rate-limit allows subsequent checks but fails at 60.
- Verify `unique_clicks:<code>` has an automated `TTL` applied in Redis by checking TTL with CLI.
