# URL Shortener

A production-grade, full-stack URL shortener engineered for high-throughput link resolution and real-time analytics. Built as a TypeScript monorepo with a strict separation of concerns, the system addresses the core engineering challenges of link shortening at scale: sub-millisecond redirection via multi-layer caching, guaranteed analytics delivery without blocking the critical redirect path, and a resilient async processing pipeline powered by BullMQ.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Engineering Decisions](#key-engineering-decisions)
- [Feature Overview](#feature-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Data Model Overview](#data-model-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## System Architecture

The system is composed of three independently runnable processes: the main HTTP API server (which also hosts an in-process BullMQ click worker), the background worker process for cron-scheduled jobs, and the React SPA. This design allows analytics processing to fail gracefully without ever impacting link resolution availability.

### Redirection Flow (Critical Path)

```
Client HTTP GET /:shortCode
        |
        v
  Rate Limiter (express-rate-limit, IP + route keyed)
        |
        v
  Redis Cache Lookup  --------[HIT]---------> HTTP 302 Redirect
        |                                           |
      [MISS]                              BullMQ Producer (fire-and-forget)
        |                                           |
        v                                           v
  PostgreSQL Query (Prisma)               BullMQ Queue: click-events (Redis)
        |                                           |
        v                                           v
  Cache Population (Redis, 1hr TTL)    In-process BullMQ Worker
        |                                           |
        v                              +----------------------------+
  HTTP 302 Redirect                   | GeoIP lookup (geoip-lite)  |
                                      | click_logs INSERT (Prisma) |
                                      | click_count INCREMENT      |
                                      | Redis Pub/Sub publish      |
                                      +----------------------------+
                                                   |
                                                   v
                                       SSE clients (userId-filtered)
```

### Click Analytics Flow (Non-Critical Path)

Click event publishing to BullMQ is implemented as fire-and-forget. The `publishClickEvent` function wraps all queue operations in a `try/catch` that logs on failure but never propagates the error to the redirect controller. A queue or Redis outage will cause click data loss but will **never** degrade redirection availability.

The in-process BullMQ worker (`clickWorker.ts`) runs alongside the HTTP server within the same Node.js process. It picks up jobs from the `click-events` queue with a concurrency of 5, performs a GeoIP lookup, persists the click record to PostgreSQL inside a single transaction (including an atomic `click_count` increment on the `url_mappings` table), and then publishes the enriched event to a Redis Pub/Sub channel.

### Real-Time Click Streaming (SSE)

After a click event is persisted, the BullMQ worker publishes to the `click-stream` Redis Pub/Sub channel. The `clickStream.service.ts` module maintains a dedicated Redis subscriber connection that receives these broadcasts and fans them out to connected Server-Sent Event (SSE) clients, filtered by `userId`. A 25-second heartbeat ping prevents proxy timeouts from closing idle connections.

### Background Worker Process

A separate, lightweight `worker.ts` process handles the subscription expiry cron job. It runs on a `node-cron` schedule (every hour) to scan and transition overdue subscriptions from `active` to `expired`. This process is entirely independent of the API server.

---

## Key Engineering Decisions

### 1. BigInt-to-Base62 ID Encoding for Short Code Generation

Short codes are not randomly generated strings. They are derived deterministically from the database primary key using a BigInt-to-Base62 encoding strategy:

```
encodeIdToBase62(id: bigint): string
  base = 62n
  while id > 0:
    remainder = id % base
    result = BASE62_CHARS[remainder] + result
    id = id / base (integer division)
```

This approach is collision-free by design, because the database enforces the uniqueness of the primary key. The encoding happens inside a single Prisma transaction: the row is first inserted to acquire the auto-incremented ID, then immediately updated with the computed `short_code`. This eliminates a separate collision-check query entirely. The Base62 character set (`0-9a-zA-Z`) produces compact, URL-safe codes.

### 2. BullMQ over Direct Database Writes for Click Tracking

The decision to use BullMQ over synchronous database writes in the redirect handler is deliberate. A direct PostgreSQL `INSERT` in the redirect controller would add variable latency (typically 2–10 ms under load) to every redirect response. By enqueuing a BullMQ job instead, the redirect completes as soon as the job is acknowledged, and the database write is deferred to the worker.

BullMQ is backed by Redis, which is already a hard dependency for caching and token blacklisting. This removes the need for a separate message broker like Kafka. Jobs are configured with 3 retry attempts and exponential backoff, providing at-least-once delivery semantics for click events.

### 3. Redis as a Degradation-Tolerant Cache

The Redis caching layer is designed to be an optimization, not a hard dependency. Both `getCachedLink` and `cacheLink` wrap their ioredis calls in `try/catch` blocks that silently fall back to PostgreSQL on error:

```typescript
// linkCache.service.ts
async function getCachedLink(shortCode: string) {
  try {
    const cached = await redis.get(CACHE_KEY(shortCode));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.warn('Redis: getCachedLink failed — falling back to DB', { shortCode, error });
    return null; // graceful degradation, not a thrown error
  }
}
```

A Redis node failure results in every request falling through to PostgreSQL, degrading performance but maintaining full correctness. Cache entries are explicitly invalidated (e.g., when a QR code is disabled) to prevent stale data from serving incorrect redirect targets.

### 4. Dedicated Redis Connections for BullMQ

BullMQ requires a dedicated ioredis connection with `maxRetriesPerRequest: null`. To avoid interfering with the main application cache and the Redis Pub/Sub subscriber, the system uses three separate ioredis client instances:

| Connection | Used By |
|---|---|
| `redis` (main client) | Link cache, JWT blacklist |
| `bullConnection` | BullMQ Queue producer + Worker |
| `redisPub` | Pub/Sub publisher (inside click worker) |
| `redisSub` | Pub/Sub subscriber (SSE broadcast) |

On startup, `initQueue` also verifies that the Redis `maxmemory-policy` is set to `noeviction` and attempts to configure it automatically, preventing BullMQ job loss under memory pressure.

### 5. Denormalized `click_count` Counter

The `url_mappings` table carries a `click_count BigInt` column that is atomically incremented by the BullMQ worker inside a Prisma transaction alongside the `click_logs` INSERT. This avoids expensive `COUNT(*)` aggregates on the `click_logs` table when rendering the link list view, reducing read latency for high-volume links to a single indexed row lookup.

### 6. SQL-Level Timeseries Aggregation

Click timeseries data is aggregated in PostgreSQL using `DATE_TRUNC`, not in Node.js memory. The service layer (`analytics.service.ts`) only performs zero-filling for empty time buckets — all counting and grouping is pushed to the database engine. This keeps Node.js memory usage flat regardless of click volume.

### 7. JWT Token Blacklisting with Redis

Upon logout, the access token is stored in Redis with a TTL equal to its remaining validity period. The `verifyToken` middleware checks this blacklist before processing any authenticated request:

```typescript
const blacklisted = await isTokenBlacklisted(token);
if (blacklisted) throw new UnauthorizedError('Token has been revoked!');
```

This provides true stateless token invalidation without requiring a server-side session store. The TTL-based expiry ensures the blacklist does not grow unboundedly.

### 8. Multi-Tiered Rate Limiting

The API applies rate limiting at multiple, independently configurable layers:

| Limiter | Window | Max Requests | Key Strategy |
|---|---|---|---|
| `globalAuthRateLimit` | 1 minute | 100 | IP |
| `loginRateLimit` | 10 minutes | 10 (failed only) | IP + email |
| `registerRateLimit` | 1 hour | 5 | IP |
| `redirectRateLimit` | Configurable | Configurable | IP |

The login limiter uses `skipSuccessfulRequests: true`, meaning only failed authentication attempts are counted. The composite key (`IP + email`) prevents a distributed brute-force attack across multiple IPs targeting the same account from bypassing a pure IP-based limit.

### 9. Subscription Quota Enforcement

All link creation and QR code generation requests are preceded by an `assertCanCreateLink` guard that runs two parallel database queries (active plan limits and current-month usage), computes the remaining quota, and throws a typed `QuotaExceededError` if the limit is reached. This guard is atomic within a request and always runs before any destructive database operation.

### 10. Idempotent VNPay Payment Processing

The payment IPN (Instant Payment Notification) handler uses `updateMany` with a `status = 'pending'` filter condition as an optimistic lock. If the IPN is delivered more than once (a common scenario with payment gateways), the second invocation will match zero rows and exit without performing duplicate database operations. HMAC-SHA512 signature verification (`verifyVnPayReturn`) is always performed before any state mutation.

---

## Feature Overview

- **URL Shortening**: Generates collision-free short codes from database IDs using BigInt-to-Base62 encoding inside an atomic Prisma transaction. Supports both auto-generated and custom alias short codes.
- **Sub-Millisecond Redirection**: Redis-backed cache with a 1-hour TTL reduces median redirect latency to the network round-trip cost of a single Redis `GET`.
- **Link Expiration**: Short links can be assigned an expiry timestamp. Expired links return a `404` response on resolution.
- **QR Code Lifecycle Management**: QR codes are first-class entities bound to short links, supporting an active/locked state machine with atomic `is_active` toggling and cache invalidation on state change. Visual properties (foreground/background color, error correction level, size) are persisted and applied on regeneration via Cloudinary.
- **Grouped Click Analytics**: Server-side time-series aggregation (`DATE_TRUNC`) of click events grouped by browser, OS, device type, country, referrer, and interaction type (`CLICK` vs. `SCAN`). Gated behind paid subscription tiers.
- **Real-Time Click Feed**: Authenticated users receive a live stream of click events for their links via Server-Sent Events, sourced from the Redis Pub/Sub channel populated by the BullMQ click worker.
- **Subscription & Billing**: Plan-based quota enforcement for links, custom aliases, and QR codes. Integrated with VNPay as the payment gateway. Subscription activation, quota tracking, and expiry are managed in PostgreSQL.
- **Authentication**: Email/password registration with bcrypt hashing, JWT access/refresh token pair, Google OAuth via `google-auth-library`, and Redis-backed token blacklisting on logout.
- **Password Recovery**: Transactional email flow with time-limited reset tokens, implemented with Nodemailer.
- **Request Validation**: All incoming request bodies and query parameters are validated against Zod schemas before reaching controllers, via a centralized `validate` middleware.
- **Scheduled Jobs**: A `node-cron` job runs hourly in the background worker process to mark expired subscriptions as `expired` in the database.

---

## Technology Stack

### Frontend

| Category | Technology |
|---|---|
| Framework | React 19, TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4, MUI (Material UI) 9 |
| State Management | Zustand 5 |
| Server State & Caching | TanStack Query (React Query) 5 |
| Routing | React Router DOM 7 |
| HTTP Client | Axios |
| Charts | Recharts 3 |
| QR Rendering | qrcode.react |
| Icons | Lucide React, react-icons |
| Notifications | react-hot-toast |
| Date Utilities | date-fns 4 |

### Backend

| Category | Technology |
|---|---|
| Runtime | Node.js (ESM), TypeScript 6 |
| Framework | Express 5 |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) |
| Job Queue | BullMQ 5 (Redis-backed) |
| Validation | Zod 4 |
| Authentication | jsonwebtoken, bcrypt, google-auth-library |
| GeoIP | geoip-lite |
| Media Storage | Cloudinary |
| User-Agent Parsing | ua-parser-js |
| Email | Nodemailer |
| Scheduler | node-cron |
| Security | Helmet, express-rate-limit |
| Logging | morgan |

### Infrastructure & Data

| Category | Technology |
|---|---|
| Primary Database | PostgreSQL |
| Cache, Job Queue & Pub/Sub | Redis (via ioredis) |
| Payment Gateway | VNPay |
| Containerization | Docker, Docker Compose |

---

## Project Structure

```
url-shortener/
├── frontend/                        # React Single-Page Application
│   └── src/
│       ├── api/                     # Axios client instances and typed API call functions
│       ├── components/              # Stateless, reusable UI components
│       │   ├── analytics/
│       │   ├── links/
│       │   └── qr/
│       ├── config/                  # App-level constants (QR defaults, etc.)
│       ├── hooks/                   # Custom React hooks (data fetching, URL-synced filters)
│       ├── layout/                  # Route-level layout wrappers (DashboardLayout)
│       ├── pages/                   # Container components mapped 1:1 to routes
│       │   ├── CreateLink/          # Link creation form with quota awareness
│       │   ├── Home/                # Landing page
│       │   ├── LinkAnalytics/       # Per-link analytics dashboard
│       │   ├── Links/               # Paginated link management table
│       │   ├── QrList/              # QR code gallery
│       │   ├── RealtimeAnalytics/   # Live SSE click feed
│       │   ├── Settings/            # User settings and appearance
│       │   └── Upgrade/             # Subscription plan selection
│       ├── store/                   # Zustand global state slices
│       │   ├── useAuthStore.ts      # Authentication state
│       │   ├── useConfirmStore.ts   # Promise-based imperative confirm dialog
│       │   └── usePlanStore.ts      # Active plan context
│       ├── types/                   # Shared TypeScript interfaces and type aliases
│       └── utils/                   # Pure utility functions (date formatting, etc.)
│
└── server/                          # Node.js API Server
    ├── app/
    │   ├── controllers/             # HTTP request handlers (thin layer, delegates to services)
    │   ├── errors/                  # Typed application error classes (AppError hierarchy)
    │   ├── jobs/
    │   │   └── expireSubscriptions.job.ts  # Subscription expiry logic (called by server + worker)
    │   ├── libs/                    # Singleton clients (Prisma, Redis)
    │   ├── middlewares/             # Express middleware (auth, rate limiting, validation)
    │   ├── repositories/            # Data access layer (all Prisma queries isolated here)
    │   ├── routes/                  # Express router definitions
    │   ├── schemas/                 # Zod validation schemas per domain
    │   ├── services/                # Core business logic
    │   │   ├── analytics.service.ts         # Timeseries + breakdown analytics
    │   │   ├── auth.service.ts              # Registration, login, OAuth, token management
    │   │   ├── clickStream.service.ts       # SSE client pool + Redis Pub/Sub subscriber
    │   │   ├── generateLink.service.ts      # Base62 encoding + atomic short code creation
    │   │   ├── link.service.ts              # Link resolution, click event publishing
    │   │   ├── linkCache.service.ts         # Redis cache operations (get, set, invalidate)
    │   │   ├── payment.service.ts           # VNPay URL generation, IPN processing
    │   │   ├── queue.service.ts             # BullMQ Queue setup and initialization
    │   │   ├── qrCode.service.ts            # QR code CRUD and Cloudinary upload
    │   │   ├── subscription.service.ts      # Subscription plan listing
    │   │   └── subscriptionAccess.service.ts  # Quota guards and plan context
    │   ├── types/                   # Express augmentation and shared backend types
    │   ├── utils/                   # Utility functions (Base62 encoder, JWT helpers, logger)
    │   └── workers/
    │       └── clickWorker.ts       # In-process BullMQ worker (GeoIP, DB write, Pub/Sub)
    ├── prisma/
    │   ├── schema.prisma            # Database schema and relation definitions
    │   └── migrations/              # Prisma migration history
    ├── config/                      # node-config environment files
    ├── server.ts                    # Application entry point (HTTP server + BullMQ worker)
    └── worker.ts                    # Background cron process (subscription expiry)
```

---

## API Reference

All protected endpoints require the `Authorization: Bearer <access_token>` header.

### Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create a new user account |
| `POST` | `/auth/login` | No | Authenticate and receive a JWT token pair |
| `POST` | `/auth/refresh` | No | Exchange a refresh token for a new access token |
| `POST` | `/auth/google` | No | Google OAuth sign-in via ID token |
| `POST` | `/auth/forgot-password` | No | Initiate the password reset email flow |
| `POST` | `/auth/reset-password` | No | Complete password reset with a valid token |
| `GET` | `/auth/me` | Yes | Retrieve the authenticated user's profile |
| `POST` | `/auth/logout` | Yes | Revoke the access token (Redis blacklist) |

### Link Management (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/shorten` | Yes | Create a new short URL (auto-generated or custom alias) |
| `GET` | `/links` | Yes | Get a paginated list of the user's links |
| `GET` | `/links/:shortCode` | Yes | Get metadata for a single link |
| `PATCH` | `/links/:shortCode` | Yes | Update a link's title |
| `GET` | `/:shortCode` | No | Resolve and redirect (critical path) |
| `GET` | `/links/:shortCode/analytics` | Yes | Get grouped time-series click analytics |
| `GET` | `/links/:shortCode/clicks` | Yes | Get a paginated raw click log |
| `GET` | `/clicks/stream` | Yes (optional) | Subscribe to the SSE real-time click event stream |

### QR Codes (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/qr-codes` | Yes | Create a QR code bound to an existing short link |
| `GET` | `/qr-codes` | Yes | Get a paginated list of the user's QR codes |
| `GET` | `/qr-codes/:id` | Yes | Get a single QR code by ID |
| `GET` | `/links/:shortCode/qr` | Yes | Get the QR code linked to a specific short code |
| `PATCH` | `/qr-codes/:id/disable` | Yes | Transition a QR code to the locked state |
| `PATCH` | `/qr-codes/:id/enable` | Yes | Transition a QR code to the active state |
| `PATCH` | `/qr-codes/:id/regenerate` | Yes | Update QR code style and re-upload to Cloudinary |

### Subscriptions & Payments (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/subscriptions/me/plan` | Yes | Get current plan context, usage counters, and pending payment flag |
| `GET` | `/subscriptions/plans` | No | List all available subscription plans |
| `POST` | `/payment/create` | Yes | Generate a VNPay checkout URL |
| `GET` | `/payment/vnpay_return` | No | VNPay synchronous return handler (user browser redirect) |
| `GET` | `/payment/vnpay_ipn` | No | VNPay asynchronous IPN handler (server-to-server callback) |
| `GET` | `/payment/result` | Yes | Query payment result by order ID |

---

## Data Model Overview

```
users
  |-- subscriptions (one active at a time)
  |     |-- subscription_plans
  |     |-- payments
  |
  |-- user_link_monthly_usage  (monthly counters, composite PK: user_id + year_month)
  |
  |-- url_mappings  (short links)
  |     |-- click_logs  (fan-out via BullMQ worker; includes GeoIP country)
  |     |-- qr_codes    (strict 1:1, bound to a url_mapping via @unique FK)
```

**Key constraints and design decisions:**

- A `qr_codes` row requires a non-null `url_mapping_id`. Standalone QR codes are not permitted by the schema, enforced at both the DB and service layers.
- `url_mappings.short_code` carries a `UNIQUE` index for O(1) lookups during redirection.
- `url_mappings.click_count` is a denormalized counter, atomically incremented by the BullMQ worker. Avoids `COUNT(*)` scans at read time.
- `click_logs` stores both `CLICK` and `SCAN` interaction types, enabling QR-specific engagement metrics.
- `user_link_monthly_usage` is indexed on `(user_id, year_month)` for efficient quota checks without full table scans.
- `subscriptions` carries a partial index on `expires_at` filtered to `status = 'active'` rows, making the scheduled expiry job fast regardless of historical subscription count.
- `payments.provider_tx_id` is `UNIQUE` with a partial index (non-null only), providing O(1) idempotency checks for VNPay IPN callbacks.

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14
- Redis >= 6
- Docker & Docker Compose (recommended for running infrastructure)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/url-shortener.git
cd url-shortener
```

### 2. Start Infrastructure with Docker Compose

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis. Verify all services are healthy before proceeding.

> **Note**: Kafka is **not** required. The click analytics pipeline runs entirely on BullMQ, which uses the same Redis instance as the cache layer.

### 3. Configure Environment Variables

Copy the example files and populate the required values. See the [Environment Variables](#environment-variables) section for full descriptions.

```bash
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
```

### 4. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Apply Database Migrations

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

Optionally, seed the subscription plans:

```bash
npx prisma db seed
```

### 6. Run the Application

Three processes must run concurrently in development:

```bash
# Terminal 1: API server (also starts the in-process BullMQ click worker)
cd server
npm run dev

# Terminal 2: Background worker (subscription expiry cron)
cd server
npm run worker

# Terminal 3: Frontend dev server
cd frontend
npm run dev
```

The API server will be available at `http://localhost:3000` and the frontend dev server at `http://localhost:5173` by default.

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `PORT` | HTTP server port (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `REDIS_URL` | Redis connection string (used for cache, BullMQ, and Pub/Sub) |
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens |
| `JWT_ACCESS_EXPIRY` | Access token expiry duration (e.g., `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry duration (e.g., `7d`) |
| `SHORT_LINK_BASE_URL` | Public base URL prepended to generated short codes (e.g., `https://short.ly`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `SMTP_HOST` | SMTP server hostname for Nodemailer |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `vnp_TmnCode` | VNPay merchant terminal code |
| `vnp_HashSecret` | VNPay HMAC-SHA512 secret key |
| `vnp_Url` | VNPay payment gateway URL |
| `vnp_ReturnUrl` | VNPay synchronous return URL (points to your frontend) |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for the backend API (e.g., `http://localhost:3000/api/v1`) |
| `VITE_SHORT_LINK_BASE_URL` | Public base URL for displaying short links in the UI |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID (must match the backend value) |

---

## License

**Author**: Pham Phuc Duy

**Contact**: phucduy.dev@gmail.com
