# url-shortener

A production-grade, full-stack URL shortener engineered for high-throughput link resolution and real-time analytics. Built with a strict separation of concerns across a TypeScript monorepo, the system solves the core engineering challenges of link shortening at scale: sub-millisecond redirection via multi-layer caching, guaranteed analytics delivery without blocking the critical redirect path, and a resilient event-driven pipeline using Apache Kafka.

![Application Screenshot](./docs/images/app-screenshot.png)

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

The system is composed of three independently runnable processes: the HTTP API server, the Kafka analytics consumer, and the React SPA. This separation allows the analytics processing to scale or fail independently without impacting link resolution availability.

![Architecture Diagram](./docs/images/architecture-diagram.png)

**Redirection Flow (Critical Path)**

```
Client HTTP GET /:shortCode
        |
        v
  Rate Limiter (express-rate-limit, IP + route keyed)
        |
        v
  Redis Cache Lookup  --------[HIT]---------> HTTP 302 Redirect
        |                                           |
      [MISS]                              Kafka Producer (fire-and-forget)
        |                                           |
        v                                           v
  PostgreSQL Query (Prisma)               Kafka Topic: click-events
        |                                           |
        v                                           v
  Cache Population (Redis, 1hr TTL)    Kafka Consumer (standalone process)
        |                                           |
        v                                           v
  HTTP 302 Redirect                      PostgreSQL click_logs INSERT
```

**Click Analytics Flow (Non-Critical Path)**

Click event publishing to Kafka is implemented as fire-and-forget. The `publishClickEvent` function wraps all Kafka calls in a `try/catch` that logs on failure but never propagates the error to the redirect controller. A Kafka outage will cause click data loss but will never degrade redirection availability.

The standalone consumer process (`worker.ts`) subscribes to the `click-events` topic, validates incoming messages against a strict type guard, and performs the PostgreSQL insert. Malformed or missing messages are logged and skipped without halting the consumer.

**Real-Time Click Streaming (SSE)**

After a click event is persisted, the server also maintains a pool of authenticated Server-Sent Event (SSE) connections. A second Kafka consumer (`clickStream.service.ts`) running in-process reads from the same topic and broadcasts events to the appropriate user's SSE client, filtered by `userId`. A 25-second heartbeat ping prevents proxy timeouts from closing idle connections.

---

## Key Engineering Decisions

### 1. BigInt-to-Base62 ID Encoding for Short Code Generation

Short codes are not randomly generated strings. Instead, they are derived deterministically from the database primary key using a BigInt-to-Base62 encoding strategy:

```
encodeIdToBase62(id: bigint): string
  base = 62n
  while id > 0:
    remainder = id % base
    result = BASE62_CHARS[remainder] + result
    id = id / base (integer division)
```

This approach is collision-free by design, because the database enforces the uniqueness of the primary key. The encoding happens inside a single Prisma transaction: the row is first inserted to acquire the auto-incremented ID, then the row is immediately updated with the computed `short_code`. This avoids a separate collision-check query. The Base62 character set (`0-9a-zA-Z`) produces compact, URL-safe codes.

### 2. Redis as a Degradation-Tolerant Cache

The Redis caching layer is designed to be an optimization, not a hard dependency. Both `getCachedLink` and `cacheLink` wrap their ioredis calls in `try/catch` blocks that silently fall back to the database on error:

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

A Redis node failure results in every request falling through to PostgreSQL, degrading performance but maintaining full correctness. Cache entries are invalidated explicitly (e.g., when a QR code is disabled) to prevent stale data from serving incorrect redirect targets.

### 3. Kafka for Decoupled Analytics Ingestion

The decision to use Kafka over synchronous database writes for click tracking is deliberate. A direct PostgreSQL insert in the redirect handler would add variable latency (typically 2-10ms under load) to every redirect response. By publishing to Kafka instead, the redirect completes as soon as the message is acknowledged by the broker, and the database write is deferred to the consumer process.

The Kafka producer and consumer share a single `Kafka` client instance (from `kafka.service.ts`) to avoid redundant broker connections. The `initKafka` function is designed to be non-blocking on startup: if Kafka is unavailable, the server logs a warning and proceeds to serve requests. Analytics will resume automatically once the broker reconnects.

### 4. JWT Token Blacklisting with Redis

Upon logout, the access token is stored in Redis with a TTL equal to its remaining validity period. The `verifyToken` middleware checks this blacklist before processing any authenticated request:

```typescript
const blacklisted = await isTokenBlacklisted(token);
if (blacklisted) throw new UnauthorizedError('Token has been revoked!');
```

This provides true stateless token invalidation without requiring a server-side session store. The TTL-based expiry ensures the blacklist does not grow unboundedly.

### 5. Multi-Tiered Rate Limiting

The API applies rate limiting at multiple, independently configurable layers:

| Limiter | Window | Max Requests | Key Strategy |
|---|---|---|---|
| `globalAuthRateLimit` | 1 minute | 100 | IP |
| `loginRateLimit` | 10 minutes | 10 (failed only) | IP + email |
| `registerRateLimit` | 1 hour | 5 | IP |
| `redirectRateLimit` | Configurable | Configurable | IP |

The login limiter uses `skipSuccessfulRequests: true`, meaning only failed authentication attempts are counted. The key strategy for login is composite (`IP + email`), which prevents a distributed brute-force attack across multiple IPs targeting the same account from bypassing a pure IP-based limit.

### 6. Subscription Quota Enforcement

All link creation and QR code generation requests are preceded by a `assertCanCreateLink` guard that runs two parallel database queries (current plan limits and current-month usage), computes the remaining quota, and throws a typed `QuotaExceededError` if the limit is reached. This guard is atomic within a request and runs before any destructive database operation.

### 7. Idempotent VNPay Payment Processing

The payment IPN (Instant Payment Notification) handler uses `updateMany` with a `status = 'pending'` filter condition as an optimistic lock. If the IPN is delivered more than once (a real scenario with payment gateways), the second invocation will match zero rows and exit without performing duplicate database operations. HMAC-SHA512 signature verification (`verifyVnPayReturn`) is always performed before any state mutation.

---

## Feature Overview

- **URL Shortening**: Generates collision-free short codes from database IDs using BigInt-to-Base62 encoding, inside an atomic Prisma transaction.
- **Sub-Millisecond Redirection**: Redis-backed cache with a 1-hour TTL reduces median redirect latency to the network round-trip cost of a single Redis GET.
- **QR Code Lifecycle Management**: QR codes are first-class entities bound to short links, supporting an active/locked state machine with atomic `is_active` toggling and cache invalidation on state change.
- **Grouped Click Analytics**: Time-series aggregation of click events grouped by browser, OS, device type, referrer, and interaction type (CLICK vs. SCAN for QR code hits), gated behind paid subscription tiers.
- **Real-Time Click Feed**: Authenticated users receive a live stream of click events for their links via Server-Sent Events, sourced from the Kafka consumer.
- **Subscription & Billing**: Plan-based quota enforcement for links and QR codes, integrated with VNPay as the payment gateway. Subscription activation, quota tracking, and expiry are managed in PostgreSQL.
- **Authentication**: Email/password registration with bcrypt hashing, JWT access and refresh token pair, Google OAuth via `google-auth-library`, and Redis-backed token blacklisting on logout.
- **Password Recovery**: Transactional email flow with time-limited reset tokens, implemented with Nodemailer.
- **Request Validation**: All incoming request bodies and query parameters are validated against Zod schemas before reaching controllers, with a centralized `validate` middleware.
- **Scheduled Jobs**: A `node-cron` job runs on a configurable schedule to mark expired subscriptions as `expired` in the database.

---

## Technology Stack

### Frontend

| Category | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 4, MUI (Material UI) 9 |
| State Management | Zustand 5 |
| Server State & Caching | TanStack Query (React Query) 5 |
| Routing | React Router DOM 7 |
| HTTP Client | Axios |
| Charts | Recharts |
| QR Rendering | qrcode.react |
| Notifications | react-hot-toast |

### Backend

| Category | Technology |
|---|---|
| Runtime | Node.js (ESM), TypeScript 6 |
| Framework | Express 5 |
| ORM | Prisma 7 (with `@prisma/adapter-pg` for direct PostgreSQL) |
| Message Broker | Apache Kafka (via kafkajs 2) |
| Validation | Zod 4 |
| Authentication | jsonwebtoken, bcrypt, google-auth-library |
| Media Storage | Cloudinary |
| User-Agent Parsing | ua-parser-js |
| Email | Nodemailer |
| Security | Helmet, express-rate-limit |
| Logging | morgan |

### Infrastructure & Data

| Category | Technology |
|---|---|
| Primary Database | PostgreSQL |
| Cache & Token Blacklist | Redis (via ioredis) |
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
│       ├── hooks/                   # Custom React hooks (data fetching, URL-synced filters)
│       ├── layout/                  # Route-level layout wrappers (DashboardLayout)
│       ├── pages/                   # Container components mapped 1:1 to routes
│       ├── store/                   # Zustand global state slices
│       │   ├── useAuthStore.ts
│       │   ├── useConfirmStore.ts   # Promise-based imperative confirm dialog
│       │   └── usePlanStore.ts
│       ├── types/                   # Shared TypeScript interfaces and type aliases
│       └── utils/                   # Pure utility functions (date formatting, etc.)
│
└── server/                          # Node.js API Server
    ├── app/
    │   ├── consumers/
    │   │   └── consumer.ts          # Standalone Kafka consumer process for click logging
    │   ├── controllers/             # HTTP request handlers (thin layer, delegates to services)
    │   ├── errors/                  # Typed application error classes (AppError hierarchy)
    │   ├── jobs/
    │   │   └── expireSubscriptions.job.ts  # node-cron scheduled task
    │   ├── libs/                    # Singleton clients (Prisma, Redis)
    │   ├── middlewares/             # Express middleware (auth, rate limiting, validation)
    │   ├── repositories/            # Data access layer (all Prisma queries isolated here)
    │   ├── routes/                  # Express router definitions
    │   ├── schemas/                 # Zod validation schemas per domain
    │   ├── services/                # Core business logic
    │   │   ├── analytics.service.ts
    │   │   ├── auth.service.ts
    │   │   ├── clickStream.service.ts  # SSE client pool + Kafka broadcast consumer
    │   │   ├── generateLink.service.ts # Base62 encoding + atomic short code creation
    │   │   ├── kafka.service.ts        # Shared Kafka client, producer, topic init
    │   │   ├── link.service.ts         # Link resolution, click event publishing
    │   │   ├── linkCache.service.ts    # Redis cache operations (get, set, invalidate)
    │   │   ├── payment.service.ts      # VNPay URL generation, IPN processing
    │   │   ├── qrCode.service.ts       # QR code CRUD and Cloudinary upload
    │   │   └── subscriptionAccess.service.ts  # Quota guards and plan context
    │   ├── types/                   # Express augmentation and shared backend types
    │   └── utils/                   # Utility functions (Base62 encoder, JWT helpers, logger)
    ├── prisma/
    │   ├── schema.prisma            # Database schema and relation definitions
    │   └── migrations/              # Prisma migration history
    ├── config/                      # node-config environment files
    ├── server.ts                    # Application entry point (HTTP server bootstrap)
    └── worker.ts                    # Kafka consumer process entry point
```

---

## API Reference

All protected endpoints require the `Authorization: Bearer <access_token>` header.

### Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create a new user account |
| `POST` | `/auth/login` | No | Authenticate and receive token pair |
| `POST` | `/auth/refresh` | No | Exchange refresh token for new access token |
| `POST` | `/auth/google` | No | Google OAuth login via ID token |
| `POST` | `/auth/forgot-password` | No | Initiate password reset email flow |
| `POST` | `/auth/reset-password` | No | Complete password reset with token |
| `GET` | `/auth/me` | Yes | Retrieve authenticated user profile |
| `POST` | `/auth/logout` | Yes | Revoke access token (Redis blacklist) |

### Link Management (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/shorten` | Yes | Create a new short URL |
| `GET` | `/links` | Yes | Get paginated list of user's links |
| `GET` | `/links/:shortCode` | Yes | Get metadata for a single link |
| `PATCH` | `/links/:shortCode` | Yes | Update link title |
| `GET` | `/:shortCode` | No | Resolve and redirect (critical path) |
| `GET` | `/links/:shortCode/analytics` | Yes | Get grouped time-series click analytics |
| `GET` | `/links/:shortCode/clicks` | Yes | Get paginated raw click log |
| `GET` | `/clicks/stream` | Yes (optional) | Subscribe to SSE click event stream |

### QR Codes (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/qr-codes` | Yes | Create QR code bound to an existing short link |
| `GET` | `/qr-codes` | Yes | Get paginated list of user's QR codes |
| `GET` | `/qr-codes/:id` | Yes | Get single QR code by ID |
| `GET` | `/links/:shortCode/qr` | Yes | Get QR code linked to a specific short code |
| `PATCH` | `/qr-codes/:id/disable` | Yes | Transition QR code to locked state |
| `PATCH` | `/qr-codes/:id/enable` | Yes | Transition QR code to active state |
| `PATCH` | `/qr-codes/:id/regenerate` | Yes | Update QR code style and re-upload to Cloudinary |

### Subscriptions & Payments (`/api/v1`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/subscriptions/me/plan` | Yes | Get current plan context, usage, and pending payment flag |
| `GET` | `/subscriptions/plans` | No | List all available subscription plans |
| `POST` | `/payment/create` | Yes | Generate VNPay checkout URL |
| `GET` | `/payment/vnpay_return` | No | VNPay synchronous return handler (user redirect) |
| `GET` | `/payment/vnpay_ipn` | No | VNPay asynchronous IPN handler (server-to-server) |
| `GET` | `/payment/result` | Yes | Query payment result by order ID |

---

## Data Model Overview

```
users
  |-- subscriptions (one active at a time)
  |     |-- subscription_plans
  |     |-- payments
  |
  |-- plan_usage (monthly counters, indexed by year_month)
  |
  |-- url_mappings (short links)
  |     |-- click_logs  (fan-out via Kafka consumer)
  |     |-- qr_codes    (1:1, bound to a url_mapping)
```

**Key constraints:**

- A `qr_code` row requires a non-null `url_mapping_id`. Standalone QR codes are not permitted by the schema.
- `url_mappings.short_code` carries a unique index for O(1) lookups.
- `click_logs` stores both `CLICK` and `SCAN` interaction types, enabling QR-specific engagement metrics.
- `plan_usage` is indexed on `(user_id, year_month)` for efficient monthly quota lookups without full table scans.

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14
- Redis >= 6
- Apache Kafka >= 3.x
- Docker & Docker Compose (recommended for infrastructure)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/url-shortener.git
cd url-shortener
```

### 2. Start Infrastructure with Docker Compose

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, and Kafka. Verify all services are healthy before proceeding.

### 3. Configure Environment Variables

Copy the example files and populate the required values. See the [Environment Variables](#environment-variables) section for descriptions.

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
# Terminal 1: API server
cd server
npm run dev

# Terminal 2: Kafka analytics consumer
cd server
npm run worker

# Terminal 3: Frontend dev server
cd frontend
npm run dev
```

---

## Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens |
| `JWT_ACCESS_EXPIRY` | Access token expiry duration (e.g., `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry duration (e.g., `7d`) |
| `KAFKA_BROKERS` | Comma-separated list of Kafka broker addresses |
| `KAFKA_CLIENT_ID` | Kafka client identifier for this application |
| `KAFKA_CLICK_TOPIC` | Kafka topic name for click events (default: `click-events`) |
| `KAFKA_STREAM_GROUP_ID` | Consumer group ID for the SSE broadcast consumer |
| `SHORT_LINK_BASE_URL` | Public base URL for generated short links |
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
| `VITE_API_BASE_URL` | Base URL for the backend API (e.g., `http://localhost:5000/api/v1`) |
| `VITE_SHORT_LINK_BASE_URL` | Public base URL for displaying short links in the UI |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID (must match the backend value) |

---

## License

**Author**: Pham Phuc Duy

**Contact**: phucduy.dev@gmail.com

