# URL Shortener — Project Review & Kafka → BullMQ Migration Plan

---

## 1. What Is Already Implemented

### Backend — Core Features

| Feature | Status | Notes |
|---|---|---|
| URL shortening (Base62 encoding) | ✅ Done | `generateLink.service.ts` — BigInt → base62, atomic via Prisma transaction |
| Short-link redirect | ✅ Done | Redis cache → DB fallback, `redirecLink.controller.ts` |
| Redis link cache | ✅ Done | 1-hour TTL, invalidated on QR disable/enable |
| Unique-click deduplication | ✅ Done | Redis `SADD` with 24h TTL per `(shortCode, IP)` pair |
| Click event publishing (Kafka) | ✅ Done | `publishClickEvent` in `link.service.ts` |
| Click event persistence (Kafka consumer) | ✅ Done | Standalone `consumer.ts` writes to `click_logs` |
| Real-time SSE click stream | ✅ Done | `clickStream.service.ts` + Kafka consumer group |
| JWT auth (access + refresh tokens) | ✅ Done | 15-min access token, 7-day refresh in httpOnly cookie |
| Google OAuth | ✅ Done | ID-token redirect flow in `googleLogin.controller.ts` |
| Forgot / reset password | ✅ Done | SHA-256 hashed token, 15-min expiry, email via Nodemailer |
| Subscription plans (free/basic/premium/enterprise) | ✅ Done | 4 tiers with full quota config |
| Monthly quota enforcement (links, QR codes) | ✅ Done | `assertCanCreateLink` with upsert usage counter |
| Subscription lifecycle (create, cancel, expiry job) | ✅ Done | VNPay payment, background job every 5 min |
| QR code creation, regeneration, enable/disable | ✅ Done | Full CRUD in `qrCode.service.ts` |
| Link analytics — timeseries (hourly/daily) | ✅ Done | Zero-filled buckets, `last24h/7d/30d/custom` modes |
| Link analytics — referrers, countries, devices/browser/OS | ✅ Done | Raw SQL CTEs in `analytics.repo.ts` |
| Rate limiting (redirect, auth, login, register) | ✅ Done | `express-rate-limit` middleware, multiple tiers |
| Analytics plan-gate (paid feature only) | ✅ Done | `assertAnalyticsAccess` in `subscriptionAccess.service.ts` |
| Cursor-based pagination (links, QR codes) | ✅ Done | BigInt cursor, consistent sort |
| Sort/filter/search for links and QR codes | ✅ Done | URL-synced state in React hooks |

### Frontend — Pages & Components

| Page / Component | Status |
|---|---|
| Home (public URL shortener) | ✅ Done |
| Login / Register / Forgot/Reset Password | ✅ Done |
| Google OAuth redirect handler | ✅ Done |
| Dashboard (quick-create) | ✅ Done |
| Links page (list, filter, sort, search) | ✅ Done |
| Link detail + analytics page | ✅ Done |
| QR Codes page (list, filter, enable/disable) | ✅ Done |
| Realtime analytics (SSE click stream) | ✅ Done |
| Upgrade / pricing page | ✅ Done |
| Payment result page | ✅ Done |
| Edit Link modal (title + QR style) | ✅ Done |
| Create QR Code inline panel | ✅ Done |
| Plan-gate overlay (blur + upgrade CTA) | ✅ Done |
| Date range filter popover (calendar + shortcuts) | ✅ Done |
| Time filter popover (presets + custom calendar) | ✅ Done |

---

## 2. Bugs That Must Be Fixed

### Bug 1 — `PLAN_REQUIRED` vs `FORBIDDEN` error code mismatch (critical)

**File:** `server/app/services/subscriptionAccess.service.ts`

The server throws `ForbiddenError` (code `"FORBIDDEN"`), but the frontend in
`useLinkAnalyticsData.ts` checks for code `"PLAN_REQUIRED"`. Free users who hit
the analytics endpoint will never trigger `isPlanGated = true` — they instead see
a generic error state.

**Fix:** Change the thrown error in `assertAnalyticsAccess`:

```ts
// Before
throw new ForbiddenError("Analytics feature is only available for paid accounts.");

// After — add a custom code the frontend already expects
import { AppError } from "../errors/app.error.js";
throw new AppError(403, "PLAN_REQUIRED", "Analytics feature is only available for paid accounts.");
```

### Bug 2 — `getShortUrlDisplay` uses API base URL instead of short-link domain

**File:** `frontend/src/utils/url.ts`

```ts
// Current (wrong) — uses API server URL for short links
const domain = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Fix — use the dedicated short-link domain env var
const domain = import.meta.env.VITE_SHORT_LINK_BASE_URL
             || import.meta.env.VITE_API_BASE_URL
             || 'http://localhost:3000';
```

### Bug 3 — `analyticsQuerySchema` always errors for `code` field on `PLAN_REQUIRED`

The `analytics.schema.ts` only validates the `query` — the controller catches `ForbiddenError` from `assertAnalyticsAccess`, which is correct; but the error code needs to match (see Bug 1).

---

## 3. Missing Features

### Missing Feature 1 — Country/GeoIP population (medium priority)

The `click_logs.country` column exists and the analytics query reads from it, but **nothing ever writes to it**. Every country row is `NULL`, so `CountryBreakdownCard` always shows empty data.

**What to add:**

Install a lightweight GeoIP library (`geoip-lite` or `@maxmind/geoip2-node`) and populate the field in the Kafka consumer / BullMQ worker when persisting a click event.

```ts
import geoip from 'geoip-lite';

const geo = geoip.lookup(clickData.ip);
const country = geo?.country ?? null; // e.g. "VN", "US"

await prisma.click_logs.create({
  data: {
    ...
    country,
  }
});
```

### Missing Feature 2 — Custom alias creation (medium priority)

The schema has `is_custom: Boolean` and the plan has `max_custom_links`, the quota check has a branch for `isCustom: true`, but **there is no API endpoint to create a custom alias**. The `CreateLink.tsx` page has a domain selector but it does nothing beyond selecting the base domain.

**What to add:**

1. Add `customAlias?: string` to the shorten request body schema.
2. In `generateLink.service.ts`, skip the base62 encoding and use the alias directly when provided, checking for uniqueness and the user's `allow_custom_domain` plan flag.
3. Wire up the "custom back-half" input on the Create Link form.

### Missing Feature 3 — Link expiration enforcement (medium priority)

The `url_mappings.expires_at` column exists and the schema even has the `allow_expiry` plan flag, but the **redirect controller never checks whether a link has expired**. An expired link still redirects.

**What to add:** In `redirecLink.controller.ts` (or `linkCache.service.ts`), check `expires_at` against `Date.now()` and return a 410 Gone when expired. Also skip caching expired links.

### Missing Feature 4 — `QrFilterToolbar` component (low priority)

`frontend/src/components/qr/QrFilterToolbar.tsx` is completely empty. The QR page uses `LinksFilterToolbar` as a workaround. Fill in a proper toolbar or remove the stub file.

### Missing Feature 5 — "Show archived links" switch in DisplaySettings (low priority)

The switch exists in `DisplaySettings.tsx` but is not wired to any state or API call. Either implement soft-delete for links or remove the UI.

---

## 4. Kafka → BullMQ Migration

### Why Replace Kafka?

Kafka requires a separate broker process (or Zookeeper + Kafka cluster), a standalone consumer process, and significant operational overhead. For a project at this scale, **BullMQ** running on the same Redis instance you already have is far simpler:

- No separate broker — jobs live in Redis keys
- The worker runs in-process (or as one lightweight Node process)
- The SSE broadcast can use Redis Pub/Sub (already in-process with BullMQ)
- `bull-board` gives a nice UI for job monitoring at zero cost

### Current Data Flow (Kafka)

```
HTTP Request
    └─► publishClickEvent()  ─► Kafka producer ─► "click-events" topic
                                                        │
                              consumer.ts (separate)◄──┘
                              clickStream.service.ts ◄──┘ (second consumer group)
                                    │
                                    ▼
                              Prisma: click_logs
                              SSE broadcast to clients
```

### Target Data Flow (BullMQ)

```
HTTP Request
    └─► publishClickEvent()  ─► BullMQ Queue ("click-events")
                                        │
                               In-process Worker ◄── same Node process or worker.ts
                                        │
                              ┌─────────┴──────────┐
                              ▼                     ▼
                    Prisma: click_logs      Redis Pub/Sub "click-stream"
                                                    │
                                        SSE clients subscribe
```

---

### Step-by-Step Migration

#### Step 1 — Install dependencies

```bash
cd server
npm install bullmq
npm install --save-dev @types/bullmq   # if needed; bullmq ships its own types
npm uninstall kafkajs                   # remove Kafka after migration is done
```

#### Step 2 — Create the queue service (replaces `kafka.service.ts`)

Create `server/app/services/queue.service.ts`:

```ts
import { Queue, Worker, type Job } from 'bullmq';
import redis from '../libs/redis.js';
import { logger } from '../utils/logger.js';

export const CLICK_EVENTS_QUEUE = 'click-events';

// Shared connection config — BullMQ needs its own ioredis instance
// (BullMQ docs: don't share the connection used for other commands)
import Redis from 'ioredis';
const bullConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
});

export const clickQueue = new Queue(CLICK_EVENTS_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const initQueue = async (): Promise<void> => {
  logger.info('BullMQ: click-events queue ready.');
};
```

#### Step 3 — Update `publishClickEvent` in `link.service.ts`

Replace the Kafka producer call:

```ts
// REMOVE these imports
// import { producer, CLICK_EVENTS_TOPIC } from "./kafka.service.js";

// ADD
import { clickQueue } from './queue.service.js';

export const publishClickEvent = async (message: ClickTrackInput): Promise<void> => {
  try {
    const ownerContext = await getUrlOwnerContextRepo(message.shortCode);
    if (!ownerContext) return;

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
```

#### Step 4 — Create the BullMQ worker (replaces `consumer.ts`)

Create `server/app/workers/clickWorker.ts`:

```ts
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../libs/prisma.js';
import { logger } from '../utils/logger.js';
import { CLICK_EVENTS_QUEUE } from '../services/queue.service.js';
import geoip from 'geoip-lite';   // add GeoIP here — fixes Missing Feature 1
import type { ClickEventMessage } from '../services/link.service.js';

const bullConnection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const redisPub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export const startClickWorker = (): Worker => {
  const worker = new Worker(
    CLICK_EVENTS_QUEUE,
    async (job: Job<ClickEventMessage>) => {
      const data = job.data;

      // 1. Persist to DB
      const geo = geoip.lookup(data.ip);
      const country = geo?.country ?? null;

      await prisma.click_logs.create({
        data: {
          url_mapping_id: BigInt(data.urlMappingId),
          short_code: data.shortCode,
          user_id: data.userId,
          ip_address: data.ip ?? null,
          browser: data.browser,
          os: data.os,
          device_type: data.deviceType,
          user_agent: data.userAgent ?? null,
          referrer: data.referrer ?? null,
          clicked_at: new Date(data.timestamp),
          interaction_type: (data.interactionType ?? 'CLICK') as any,
          country,
        },
      });

      // 2. Broadcast to SSE clients via Redis Pub/Sub
      await redisPub.publish('click-stream', JSON.stringify(data));

      logger.info('BullMQ worker: click persisted', { shortCode: data.shortCode });
    },
    {
      connection: bullConnection,
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('BullMQ worker: job failed', { jobId: job?.id, error: err });
  });

  logger.info('BullMQ click worker started.');
  return worker;
};
```

#### Step 5 — Update `clickStream.service.ts` to use Redis Pub/Sub

Replace the Kafka consumer inside the SSE service:

```ts
import Redis from 'ioredis';
import type { Response } from 'express';
import { logger } from '../utils/logger.js';

type Client = { res: Response; userId?: number | null };
const clients = new Map<string, Client>();
let redisSub: Redis | null = null;
let pingInterval: NodeJS.Timeout | null = null;

const startPing = () => {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    for (const client of clients.values()) {
      try { client.res.write(': ping\n\n'); } catch { /* ignore */ }
    }
  }, 25000);
};

export const initClickStreamConsumer = async (): Promise<void> => {
  if (redisSub) return;

  redisSub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  await redisSub.subscribe('click-stream');

  redisSub.on('message', (_channel: string, message: string) => {
    try {
      const payload = JSON.parse(message);
      broadcast(payload);
    } catch {
      logger.warn('ClickStream: invalid pub/sub message');
    }
  });

  startPing();
  logger.info('ClickStream: Redis Pub/Sub subscriber started.');
};

export const addSseClient = (res: Response, userId?: number | null): string => {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client: Client = { res, userId: userId ?? undefined };
  clients.set(id, client);

  res.on('close', () => clients.delete(id));

  try {
    res.write(`event: connected\ndata: ${JSON.stringify({ id, message: 'connected' })}\n\n`);
  } catch { /* ignore */ }

  return id;
};

export const broadcast = (payload: unknown): void => {
  const data = JSON.stringify(payload);
  const targetUserId =
    typeof payload === 'object' && payload !== null &&
    typeof (payload as any).userId === 'number'
      ? (payload as any).userId : undefined;

  for (const [id, client] of clients.entries()) {
    try {
      if (typeof targetUserId !== 'undefined' && client.userId !== targetUserId) continue;
      client.res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(id);
    }
  }
};

export const activeClients = () => clients.size;
```

#### Step 6 — Update `server.ts` to start the worker and remove Kafka

```ts
import 'dotenv/config';
import app from './app/index.js';
import { initQueue } from './app/services/queue.service.js';
import { startClickWorker } from './app/workers/clickWorker.js';
import { logger } from './app/utils/logger.js';
import { expireSubscriptionsJob } from './app/jobs/expireSubscriptions.job.js';

const PORT = Number(process.env.PORT ?? 3000);

async function startServer() {
  // Init BullMQ queue
  await initQueue();

  // Start in-process click worker
  startClickWorker();

  // Subscription expiry job
  const EXPIRY_INTERVAL_MS = 5 * 60 * 1000;
  void expireSubscriptionsJob();
  setInterval(() => void expireSubscriptionsJob(), EXPIRY_INTERVAL_MS);

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error('Fatal error during server startup.', { error });
  process.exit(1);
});
```

#### Step 7 — Remove Kafka from `app/index.ts`

`kafka.service.ts` is only imported by `link.service.ts` (now replaced) and `clickStream.service.ts` (now replaced). Once Step 3 and Step 5 are done, delete:

- `server/app/services/kafka.service.ts`
- `server/app/consumers/consumer.ts`

And remove `initKafka()` from the old `server.ts`.

#### Step 8 — Add `bull-board` for job monitoring (optional but recommended)

```bash
npm install @bull-board/api @bull-board/express
```

In `server/app/index.ts`:

```ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { clickQueue } from './services/queue.service.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(clickQueue)],
  serverAdapter,
});

// Mount BEFORE other routes, protect with auth middleware if needed
app.use('/admin/queues', serverAdapter.getRouter());
```

---

## 5. Complete Finish-the-Project Checklist

Work through these in order. Each item is self-contained.

### Phase 1 — Bug fixes (do first, unblocks everything else)

- [ ] **Fix `PLAN_REQUIRED` error code** in `assertAnalyticsAccess` (Bug 1 above)
- [ ] **Fix `getShortUrlDisplay`** to use `VITE_SHORT_LINK_BASE_URL` (Bug 2 above)
- [ ] **Add `VITE_SHORT_LINK_BASE_URL`** to `.env` and `vite.config` / `docker-compose`

### Phase 2 — Kafka → BullMQ migration

- [ ] Install `bullmq` and `geoip-lite`
- [ ] Create `server/app/services/queue.service.ts` (Step 2)
- [ ] Update `publishClickEvent` in `link.service.ts` (Step 3)
- [ ] Create `server/app/workers/clickWorker.ts` (Step 4)
- [ ] Rewrite `clickStream.service.ts` to use Redis Pub/Sub (Step 5)
- [ ] Update `server.ts` (Step 6)
- [ ] Delete `kafka.service.ts` and `consumer.ts` (Step 7)
- [ ] Remove `kafkajs` from `package.json`
- [ ] Test: create a short link, hit it, confirm click appears in DB and SSE stream

### Phase 3 — GeoIP / Country analytics (fixes Missing Feature 1)

- [ ] `npm install geoip-lite` (already included in the worker above)
- [ ] The worker (Step 4) already does GeoIP lookup — no extra work needed here
- [ ] Test: visit a short link, check `click_logs.country` is populated
- [ ] Verify `CountryBreakdownCard` now shows data

### Phase 4 — Link expiration enforcement (fixes Missing Feature 3)

- [ ] In `redirecLink.controller.ts`, after fetching from DB check `expires_at`:

```ts
const mapping = await getLongUrlByShortCode(shortCode);
if (!mapping) throw new NotFoundError("URL not found");

// Add expiry check
if (mapping.expiresAt && mapping.expiresAt < new Date()) {
  throw new NotFoundError("This link has expired.");
}
```

- [ ] Update `getLongUrlByShortCodeRepo` to also `select: { expires_at: true }`
- [ ] Update `linkCache.service.ts` to store and check `expiresAt` in the cached object (or set a TTL equal to `expires_at - now`)
- [ ] Update `getLongUrlByShortCode` in `link.service.ts` to include `expiresAt` in the return type

### Phase 5 — Custom alias creation (fixes Missing Feature 2)

**Backend:**

- [ ] Add `customAlias?: string` to `urlSchema` in `link.schema.ts`
- [ ] Update `generateShortLink` service to accept an optional alias parameter; skip base62 and use the alias directly, checking uniqueness
- [ ] In `genShortLink` controller call `assertCanCreateLink({ isCustom: true })` when alias is provided
- [ ] Return a 409 Conflict if the alias is already taken

**Frontend:**

- [ ] Add a "Custom back-half" text input to `CreateLink.tsx` below the domain selector
- [ ] Wire it through `createShortenUrl` API call as `customAlias`

### Phase 6 — UI cleanup (low priority)

- [ ] Fill in or delete `QrFilterToolbar.tsx` — either make it a real filter toolbar matching the QR page needs, or remove the stub and update the import in `QrCodes.tsx`
- [ ] Wire up "Show archived links" switch in `DisplaySettings.tsx` or remove it
- [ ] Consider extracting the `QrRegenerate` flow from `EditLinkModal` into a reusable hook (it duplicates logic from `CreateQrCode.tsx`)

---

## 6. Environment Variables Reference

Make sure these are set consistently:

```env
# Server
DATABASE_URL=postgresql://...?schema=shortlink
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
SHORT_LINK_BASE_URL=https://your-short-domain.com   # used in generateLink.service
FRONTEND_URL=https://your-frontend.com

# Frontend (.env)
VITE_API_URL=https://your-api.com/api/v1
VITE_API_BASE_URL=https://your-api.com              # used as fallback short-link domain
VITE_SHORT_LINK_BASE_URL=https://your-short-domain.com   # ADD THIS — fixes Bug 2
VITE_GOOGLE_CLIENT_ID=...
```

---

## 7. What You Can Skip

The system design document mentions several enterprise-grade features that are out of scope for your current stage:

- **CDN caching / Cloudflare Workers** — useful at 10 million+ req/day; skip for now
- **GeoDNS / multi-region deployment** — not needed until significant geographic growth
- **A/B testing (multiple destinations per short URL)** — not in your current data model; would require schema changes
- **Google Safe Browsing URL validation** — adds API cost and latency; only add if you plan to open the service publicly
- **Database read replicas** — a single Postgres instance handles your current scale easily
- **Prometheus + Grafana monitoring** — useful long-term; use BullMQ board + simple logging for now
