# ShortLink Project Master Guide

## 1. Project Overview & Purpose

ShortLink is a full-stack URL shortener platform with account-based usage and paid subscription upgrades.

Core business capabilities implemented today:

- Auth and session management:
  - Email/password register and login
  - Google OAuth login
  - JWT access token + refresh token rotation
  - Refresh token stored in httpOnly cookie + Redis
  - Access token blacklist on logout
- Link shortening (authenticated users):
  - Generate short code from long URL
  - Persist URL mapping to PostgreSQL
- Redirection and click tracking:
  - Resolve short code from Redis cache first, then DB
  - Redirect to long URL
  - Publish click event to Kafka topic click-events
  - Kafka consumer persists click logs to DB
- User link management:
  - Fetch authenticated user links for dashboard listing
- Subscription and payment flow:
  - Fetch active subscription plans
  - Create VNPay payment URL
  - Verify VNPay return/IPN signature
  - On successful payment: activate subscription and set user VIP expiry

Important reality in current implementation:

- Routes, response shapes, and naming are not perfectly uniform across modules. The guide below reflects current behavior as-is so future AI edits remain compatible.

## 2. Tech Stack & Key Libraries

### Frontend

- Language/runtime: TypeScript, React 19, Vite 8
- Routing: react-router-dom 7
- State management: Zustand
- HTTP client: Axios with custom interceptors
- Styling: Tailwind CSS v4 (via @tailwindcss/vite)
- Icons: lucide-react, react-icons
- Utility: date-fns

Primary frontend dependencies and role:

- axios: single API client with auth header injection + token refresh queueing
- zustand: global auth store (isAuthenticated, user, isLoading)
- react-router-dom: route guards and nested dashboard layout
- tailwindcss: all UI styling is utility-first classes in TSX

### Backend

- Language/runtime: TypeScript on Node.js (ESM)
- Framework: Express 5
- ORM/data access: Prisma 7 + @prisma/adapter-pg
- Database: PostgreSQL
- Cache/session infra: Redis (ioredis)
- Event streaming: Kafka (kafkajs)
- Auth/security: jsonwebtoken, bcrypt, helmet, cors, cookie-parser
- Payment integration: VNPay signature/URL handling with qs + crypto + moment + config

Primary backend dependencies and role:

- express: routing and middleware pipeline
- prisma: DB persistence for users, links, payments, subscriptions, click logs
- ioredis: refresh token store, token blacklist, short-link cache
- kafkajs: click event producer/consumer
- jsonwebtoken: access/refresh token signing/verification
- bcrypt: password hashing and verification
- config: VNPay settings from server/config/default.json

## 3. Project Structure

Top-level layout:

```text
URLShortener/
  package.json                  # Root dev orchestration (runs frontend + server + Kafka consumer)
  ai-context.md                 # This guide
  SYSTEM_DESIGN.md              # Currently empty
  frontend/
    src/
      api/                      # API wrappers around axiosClient (auth, shortUrl, payment, subscription)
      components/               # Reusable UI and route guards
        layout/                 # Dashboard shell pieces (Sidebar, Header, DashboardLayout)
      config/                   # Shared client config (axiosClient)
      hooks/                    # Reusable hooks (useLinks, useCopyToClipboard)
      pages/                    # Route-level screens
      store/                    # Zustand global stores (auth)
      types/                    # Frontend TS contracts (auth/url/subscription)
      utils/                    # View helpers (date formatting)
      App.tsx                   # Route map + auth bootstrap
      main.tsx                  # React root
  server/
    server.ts                   # HTTP bootstrap + Kafka producer init
    app/
      index.ts                  # Express app setup and middleware chain
      routes/                   # Route registrations
      middlewares/              # verifyToken + global error handlers
      controllers/              # HTTP-level handlers per feature
      services/                 # Business logic and infra orchestration
      libs/                     # Shared infra clients (Prisma, Redis)
      consumers/                # Kafka consumer process for click tracking
      utils/                    # JWT, validation, logger, short-link generation
    prisma/
      schema.prisma             # DB schema and enums
    generated/prisma/           # Generated Prisma client output
    config/default.json         # VNPay configuration
```

Placement rules inferred from current code:

- Put UI-only reusable pieces in frontend/src/components.
- Put route pages in frontend/src/pages.
- Put API call functions only in frontend/src/api, and call them from pages/hooks.
- Put cross-page state in frontend/src/store (currently auth only).
- Put backend HTTP parsing/response code in controllers.
- Put backend business logic and DB/Redis/Kafka operations in services.
- Put reusable low-level backend utilities in app/utils.

## 4. Architecture & Design Patterns

## Overall architecture

The project is a layered monorepo with separate frontend and backend apps.

- Frontend: page-and-component architecture with route-guarded navigation.
- Backend: route -> middleware -> controller -> service -> data/infra.

This is closest to a pragmatic layered architecture (not strict Clean Architecture).

## Backend request flow

Standard path:

1. Route in app/routes
2. Optional verifyToken middleware
3. Controller validates/parses request and maps HTTP response
4. Service executes business logic and data operations
5. Controller returns JSON or redirect
6. Errors either:
   - thrown and forwarded to global errorHandler via next(error), or
   - handled inline in controller/service with direct res.status(...)

Infra flow patterns:

- Auth:
  - JWT verification in middleware
  - refresh token rotation in Redis
  - blacklist access token in Redis on logout
- Redirection:
  - check Redis cache first
  - fallback to Prisma query
  - publish click event to Kafka
  - consumer writes click_logs in DB
- Payment:
  - create payment/subscription records first
  - generate VNPay URL
  - IPN verifies signature and amount
  - transaction updates payment/subscription/user VIP fields

## Frontend rendering and route pattern

- App.tsx triggers auth bootstrap on mount using useAuthStore.getState().checkAuth().
- Routes are split into:
  - PublicRoute for guest/public access with redirect if already authenticated
  - ProtectedRoute for authenticated dashboard
- Dashboard is a nested route under /dashboard with DashboardLayout + Outlet.

## 5. State Management & Data Flow

## Global state

- Managed by Zustand in frontend/src/store/useAuthStore.ts.
- AuthState fields:
  - isAuthenticated
  - user
  - isLoading
  - login, logout, checkAuth actions

Auth lifecycle:

1. Login/register success stores accessToken and user in localStorage via persistUser.
2. App startup calls checkAuth.
3. checkAuth:
   - if no token: mark unauthenticated
   - if token exists: call /auth/me
   - on success: set authenticated user
   - on failure: clear local session
4. logout calls backend then clears local session regardless of backend failure.

## API data flow

- All frontend API calls use axiosClient.
- Request interceptor:
  - adds Authorization: Bearer <accessToken> from localStorage
- Response interceptor:
  - returns response.data directly (important)
  - handles 401 by queueing pending requests, refreshing token once, retrying queued requests
  - if refresh fails: clears session and redirects to /login for protected pages

Because response is unwrapped in interceptor, many API wrappers use response.data || response patterns. This is a project-specific compatibility style that currently appears in multiple files.

## Local state patterns

- Most pages use local useState for form and UI state.
- useLinks hook handles links fetch, loading, and error for Links page.
- useCopyToClipboard hook encapsulates clipboard behavior with temporary copied state.

## 6. Coding Conventions & Style Guide

Conventions observed from codebase (not generic recommendations):

## Language and modules

- TypeScript everywhere (frontend + backend).
- ESM import style on backend with .js extension in internal imports (required by current TS/ESM setup).
- Relative imports are used throughout; no path alias configured.

## React conventions

- Functional components only.
- Most components are typed with React.FC.
- Props are typed with interface declarations near component definition.
- Hooks at top-level; route components handle their own UI and API invocation.
- Some performance-oriented memoization exists (React.memo for LinkCard/SuccessModal/SocialIconItem).

## Naming conventions

- Component files and exported components: PascalCase (DashboardLayout, PaymentResult).
- Functions/variables: camelCase.
- Type/interface names: PascalCase.
- Backend DB field names and Prisma model fields: snake_case (matches schema).
- Some API endpoint names are snake_case (create_payment_url, vnpay_ipn).

## Response and payload conventions

- Common backend response envelope often uses:
  - success
  - message
  - data
- But not universal:
  - /subscriptions/plans returns raw array
  - some handlers return { error: ... } or { message: ... } directly

## Formatting and style consistency realities

- Comment language is mixed Vietnamese + English.
- String quote style is mixed single/double depending on file.
- Tailwind classes are inline in TSX; CSS files are minimal.

When editing, follow the local style of the file you are touching, not a global reformat.

## 7. Error Handling & Logging

## Backend error handling

Primary mechanisms:

- Global middleware: errorHandler + notFoundHandler in app/middlewares/errorHandler.middleware.ts.
- Custom error classes from auth.service.ts:
  - ConflictError (409)
  - UnauthorizedError (401)
  - ValidationError (422)
- Prisma known code mapping in error handler:
  - P2002, P2025, P2003
- JWT errors mapped to 401 in global handler.

Usage pattern in controllers is mixed:

- Auth controllers use next(error) and rely on global handler.
- Several other controllers/services catch and respond directly with res.status(...).

## Frontend error handling

- API layer throws errors from axios interceptor (often error.response.data).
- Pages catch errors and:
  - set local error message state (Login/Register/useLinks), or
  - show alert (Upgrade), or
  - log to console for non-blocking issues.
- Route guards show a loading placeholder while auth check is in progress.

## Logging

- Custom logger utility exists on backend (app/utils/logger.ts).
- Console logging is also heavily used directly in controllers/services.
- Kafka flows log producer/consumer status and click event handling.

## 8. AI Coding Instructions

These are project-specific rules for future AI edits on this repository.

1. Always use existing layers.
- Backend: route -> middleware -> controller -> service -> libs/utils.
- Do not put heavy business logic directly in routes.

2. Keep auth/session flow compatible.
- Use verifyToken for protected endpoints.
- Preserve req.user contract (userId, fullName, email, role).
- Do not bypass axiosClient for frontend API calls.

3. Respect axios interceptor behavior.
- axiosClient returns unwrapped response.data.
- When writing API wrapper functions, ensure returned values match existing caller expectations.

4. Preserve ESM + TS import behavior on server.
- Keep internal import paths using .js suffix in TypeScript files under server/app.

5. Maintain localStorage keys and cookie model.
- accessToken and user keys are expected by frontend store/interceptors.
- refreshToken is cookie-managed server-side.

6. Keep naming aligned with current module.
- UI components/types in PascalCase.
- Variables/functions in camelCase.
- DB-facing fields remain snake_case unless migration is intentionally introduced.

7. Follow current response compatibility instead of forcing global standardization.
- Existing frontend already handles mixed response envelopes.
- If changing response schema in backend, update corresponding frontend api/* and consumers together.

8. Use existing hooks/store instead of duplicating logic.
- Reuse useAuthStore for auth status and actions.
- Reuse useLinks and useCopyToClipboard where appropriate.

9. For new link/payment/subscription features, wire both app and infra paths.
- If click analytics behavior changes, consider both redirect controller and Kafka consumer path.
- If payment logic changes, update create URL, return/IPN verification, and DB status transitions coherently.

10. Keep route hierarchy compatible with App.tsx.
- Dashboard child pages must be nested under /dashboard in router and layout.
- Public vs protected route guard behavior must be preserved.

11. Keep comments concise and practical.
- The codebase already uses explanatory section comments; continue this style for non-trivial logic.

12. Validate high-risk inconsistencies before refactors.
- Current code has known inconsistencies (example: mixed user shape fields, mixed env variable names, mixed endpoint envelopes). Treat these as compatibility constraints unless the task explicitly asks to normalize them across stack.

---

## Quick Reference: Existing API Surface (Current)

Auth:

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/google
- POST /api/v1/auth/logout (protected)
- GET /api/v1/auth/me (protected)

Short links:

- POST /api/v1/shorten (protected)
- GET /api/v1/links (protected)
- GET /api/v1/:shortCode (redirect)

Subscriptions:

- GET /api/v1/subscriptions/plans

Payments:

- POST /api/v1/create_payment_url (protected)
- GET /api/v1/vnpay_return
- GET /api/v1/vnpay_ipn
