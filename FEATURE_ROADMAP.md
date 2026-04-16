# FEATURE ROADMAP — ShortLink

Mục đích: lộ trình ưu tiên các tính năng mới, kèm các bước tích hợp, phạm vi ảnh hưởng, và ước lượng công việc.

---

## Tổng quan ngắn
- Thời gian: chia thành các mốc Ngắn hạn (2–4 tuần), Trung hạn (1–3 tháng), Dài hạn (3+ tháng).
- Nguyên tắc: thực hiện theo layers → backend services → API → frontend UI → infra/ops.

---

## Ưu tiên Cao (ngắn hạn)

1) Analytics Dashboard (User-level)
- Mục tiêu: hiển thị số click, nguồn truy cập, trend theo ngày/tuần/tháng.
- Phạm vi ảnh hưởng: backend (consumer/aggregation), DB (bảng/tổng hợp), API `/analytics`, frontend (new page + charts).
- Bước triển khai:
  - Tạo dịch vụ aggregation (ví dụ: pre-aggregate hàng giờ vào `link_stats`), cập nhật Kafka consumer để cập nhật bảng tổng hợp.
  - Thêm endpoint bảo mật `/analytics/links/:shortCode` (protected).
  - Frontend: page `Links` nâng cấp để hiển thị charts (chartjs/recharts).
- Migration: thêm bảng `link_stats` (date, short_code, clicks, unique_ips, etc.).
- Ước lượng: 3–5 ngày.

2) Custom Alias & Validation
- Mục tiêu: cho phép người dùng chọn alias (ví dụ: `short.ly/promo`) và validate xung đột.
- Phạm vi: backend controller + service, DB (`url_mappings` already has `is_custom`), frontend create form.
- Bước triển khai:
  - Mở rộng API `POST /shorten` body để chấp nhận `isCustom` / `customCode`.
  - Service: kiểm tra tồn tại `short_code` và tính hợp lệ (chỉ cho phép ký tự, độ dài), set `is_custom=true`.
  - Quota: enforceCreateLinkQuota phải tính `max_custom_links` theo plan.
- Migration: không cần thay schema (đã có `is_custom`), nhưng cần ensure unique index on `short_code`.
- Ước lượng: 2–3 ngày.

3) Custom Domain Support (CNAME)
- Mục tiêu: cho phép người dùng map custom domain → phục vụ redirect và analytics.
- Phạm vi: DB (store domain mapping), redirect logic (host header), frontend (UI để thêm domain), verification flow (create TXT/CNAME verification).
- Bước triển khai:
  - DB: thêm `custom_domains` table (user_id, domain, verified, verification_token).
  - Redirect: when request host matches a configured custom domain, lookup mapping to short_code.
  - UI: domain add + instructions for DNS verification.
- Migration: create `custom_domains` table + index on domain.
- Ước lượng: 5–8 ngày (bao gồm verification UX + docs).

---

## Ưu tiên Trung (1–3 tháng)

4) API Keys & Programmatic Shorten
- Mục tiêu: cho phép tạo API key scoped per user/team to programmatically create links.
- Phạm vi: backend (key management), DB (api_keys table), rate limiting per key, frontend (keys management UI).
- Bước triển khai:
  - DB migration: `api_keys` table (id, user_id, key_hash, scopes, created_at, revoked)
  - Endpoints: create/list/revoke keys; `POST /api/keys/shorten` accepts `x-api-key`.
  - Secure storage: store hashed key, show raw key only once.
- Ước lượng: 5–7 ngày.

5) QR Code Generation
- Mục tiêu: cung cấp QR tải xuống cho từng short link.
- Phạm vi: frontend (QR generation, download), backend optional (server-side QR render for sharable images).
- Bước triển khai:
  - Use client-side QR lib (qrcode) to render SVG/PNG.
  - Optionally offer server endpoint to generate high-res images.
- Ước lượng: 1–2 ngày.

6) Bulk Import / Export (CSV)
- Mục tiêu: import/export links for power users.
- Phạm vi: backend (batch endpoint), job queue (background processing), frontend (UI + progress), DB (validation dedupe).
- Bước triển khai:
  - Create `/links/import` and `/links/export` endpoints, process CSV in background (transaction + validation).
- Ước lượng: 3–6 ngày.

---

## Ưu tiên Thấp (dài hạn)

7) Team/Organization Accounts
- Tích hợp multi-user teams, shared link ownership, billing per org.
- Phạm vi lớn: schema migration (teams, memberships, roles), auth changes, frontend overhaul.
- Ước lượng: 3+ tuần.

8) Advanced Anti-abuse (WAF + rate-limits)
- Thêm IP-based throttling, bot-detection, CAPTCHA for suspicious link creation.
- Phạm vi: middleware, Redis counters, optional third-party services.
- Ước lượng: 1–2 tuần.

---

## Chung: Mô hình thực hiện (per feature)
- Step 0 — Spec: write short spec + API contract (request/response) and add to repo (docs/).
- Step 1 — DB: prepare Prisma schema and migration plan.
- Step 2 — Backend: implement service + controller + unit tests.
- Step 3 — Frontend: design UI, integrate API, add e2e or integration tests.
- Step 4 — Infra: Redis/Kafka/Workers changes, provisioning if needed.
- Step 5 — QA: run manual scenarios, validation, security review (tokens/keys), performance test on redirect path.
- Step 6 — Incremental rollout: feature flag or limited rollout (beta users) → monitor metrics → full rollout.

---

## Tests, Monitoring & Observability
- Add basic integration tests for critical flows: auth refresh rotation, redirect path, create payment URL, IPN handling.
- Add Prometheus metrics (or simple counters) for redirect latency, failed resolves, redis cache hit/miss.
- Add Sentry or lightweight error capturing for consumer and payment flows.

---

## Suggestions for next actions (fast wins)
- Implement QR code download for Links page (1–2 days).
- Add analytics API endpoint for aggregated clicks per link and a minimal frontend chart (3–5 days).
- Support custom alias input on `/shorten` (2–3 days).

---

If you want, I can:
- generate Prisma migration files for any chosen feature,
- scaffold backend controllers + services for one selected feature,
- or open PRs with the minimal frontend UI changes.

Tell me which feature to start and I will scaffold the first PR.
