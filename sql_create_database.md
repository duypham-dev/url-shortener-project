-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'expired', 'cancelled');
CREATE TYPE "PlanTier" AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE "ResetPeriod" AS ENUM ('never', 'monthly', 'yearly');


-- =============================================
-- SUBSCRIPTION PLANS
-- =============================================

CREATE TABLE subscription_plans (
  id                  SERIAL          PRIMARY KEY,
  name                VARCHAR(100)    NOT NULL,
  tier                "PlanTier"      NOT NULL DEFAULT 'basic',
  duration_days       INT             NOT NULL DEFAULT 30,
  price               DECIMAL(10, 2)  NOT NULL DEFAULT 0,
  currency            VARCHAR(10)     NOT NULL DEFAULT 'VND',
  max_links           INT             NOT NULL DEFAULT 5,    -- -1 = unlimited
  max_custom_links    INT             NOT NULL DEFAULT 0,
  reset_period        "ResetPeriod"   NOT NULL DEFAULT 'monthly',
  allow_analytics     BOOLEAN         NOT NULL DEFAULT FALSE,
  allow_expiry        BOOLEAN         NOT NULL DEFAULT FALSE,
  allow_custom_domain BOOLEAN         NOT NULL DEFAULT FALSE,
  allow_qr_code       BOOLEAN         NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
  sort_order          INT             NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ     DEFAULT NOW()
);

INSERT INTO subscription_plans
  (name, tier, duration_days, price, max_links, max_custom_links, reset_period,
   allow_analytics, allow_expiry, allow_custom_domain, allow_qr_code, sort_order)
VALUES
  ('Free',       'free',       0,   0,       10,   0,   'monthly', FALSE, FALSE, FALSE, TRUE,  0),
  ('Basic',      'basic',      30,  99000,   50,   10,  'monthly', TRUE,  TRUE,  FALSE, TRUE,  1),
  ('Premium',    'premium',    30,  299000,  200,  50,  'monthly', TRUE,  TRUE,  TRUE,  TRUE,  2),
  ('Enterprise', 'enterprise', 30,  999000,  -1,   -1,  'monthly', TRUE,  TRUE,  TRUE,  TRUE,  3);


-- =============================================
-- USERS
-- =============================================

CREATE TABLE users (
  id             SERIAL        PRIMARY KEY,
  email          VARCHAR(255)  NOT NULL UNIQUE,
  password_hash  VARCHAR       NOT NULL,
  full_name      VARCHAR(255)  NOT NULL,
  role           VARCHAR(50)   DEFAULT 'user',
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);


-- =============================================
-- SEQUENCES
-- =============================================

CREATE SEQUENCE subscriptions_id_seq;
CREATE SEQUENCE payments_id_seq;


-- =============================================
-- SUBSCRIPTIONS
-- =============================================

CREATE TABLE subscriptions (
  id          VARCHAR(255)         PRIMARY KEY DEFAULT ('sub_' || nextval('subscriptions_id_seq')::TEXT),
  user_id     INT                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     INT                  NOT NULL REFERENCES subscription_plans(id),
  status      "SubscriptionStatus" NOT NULL DEFAULT 'pending',
  started_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ          NOT NULL,
  created_at  TIMESTAMPTZ          DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_status
  ON subscriptions(user_id, status);

CREATE INDEX idx_subscriptions_expires
  ON subscriptions(expires_at)
  WHERE status = 'active';


-- =============================================
-- PAYMENTS
-- =============================================

CREATE TABLE payments (
  id               VARCHAR(255)   PRIMARY KEY DEFAULT ('pay_' || nextval('payments_id_seq')::TEXT),
  user_id          INT            NOT NULL REFERENCES users(id),
  subscription_id  VARCHAR(255)   REFERENCES subscriptions(id),
  amount           DECIMAL(10, 2) NOT NULL,
  currency         VARCHAR(10)    NOT NULL DEFAULT 'VND',
  status           "PaymentStatus" NOT NULL DEFAULT 'pending',
  provider         VARCHAR(50)    NOT NULL,
  provider_tx_id   VARCHAR(255)   UNIQUE,
  provider_payload JSONB,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_payments_user     ON payments(user_id);
CREATE INDEX idx_payments_status   ON payments(status);
CREATE INDEX idx_payments_created  ON payments(created_at DESC);
CREATE INDEX idx_payments_provider ON payments(provider_tx_id) WHERE provider_tx_id IS NOT NULL;


-- =============================================
-- URL MAPPINGS
-- =============================================

CREATE TABLE url_mappings (
  short_code  VARCHAR(10)  PRIMARY KEY,
  long_url    TEXT         NOT NULL,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255),
  is_custom   BOOLEAN      DEFAULT FALSE,
  is_active   BOOLEAN      DEFAULT TRUE,
  click_count INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX idx_url_user_id    ON url_mappings(user_id);
CREATE INDEX idx_url_expires_at ON url_mappings(expires_at);
CREATE INDEX idx_url_long_url   ON url_mappings(long_url, user_id)
  WHERE is_custom = FALSE AND is_active = TRUE;


-- =============================================
-- CLICK LOGS
-- =============================================

CREATE TABLE click_logs (
  id          BIGSERIAL    PRIMARY KEY,
  short_code  VARCHAR(10)  NOT NULL REFERENCES url_mappings(short_code) ON DELETE CASCADE,
  clicked_at  TIMESTAMPTZ  DEFAULT NOW(),
  ip_address  INET,
  user_agent  TEXT,
  referrer    VARCHAR(255),
  country     VARCHAR(100)
);

CREATE INDEX idx_click_short_code ON click_logs(short_code);
CREATE INDEX idx_click_clicked_at ON click_logs(clicked_at DESC);


-- =============================================
-- LINK MONTHLY USAGE
-- =============================================

CREATE TABLE user_link_monthly_usage (
  user_id            INT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month         CHAR(7) NOT NULL,  -- format: 'YYYY-MM'
  link_count         INT     NOT NULL DEFAULT 0,
  custom_link_count  INT     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year_month)
);

-- Trigger: tự động cập nhật khi tạo link mới
CREATE OR REPLACE FUNCTION increment_monthly_link_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_link_monthly_usage (user_id, year_month, link_count, custom_link_count)
  VALUES (
    NEW.user_id,
    TO_CHAR(NOW(), 'YYYY-MM'),
    1,
    CASE WHEN NEW.is_custom THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, year_month) DO UPDATE SET
    link_count        = user_link_monthly_usage.link_count + 1,
    custom_link_count = user_link_monthly_usage.custom_link_count
                        + CASE WHEN NEW.is_custom THEN 1 ELSE 0 END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_link_usage
AFTER INSERT ON url_mappings
FOR EACH ROW EXECUTE FUNCTION increment_monthly_link_usage();


-- =============================================
-- VIEW: Plan đang active của từng user
-- =============================================

CREATE OR REPLACE VIEW user_active_plan AS
SELECT
  u.id                                                           AS user_id,
  COALESCE(sp_active.id,                  sp_free.id)               AS plan_id,
  COALESCE(sp_active.name,                sp_free.name)             AS plan_name,
  COALESCE(sp_active.tier,                sp_free.tier)             AS plan_tier,
  COALESCE(sp_active.max_links,           sp_free.max_links)        AS max_links,
  COALESCE(sp_active.max_custom_links,    sp_free.max_custom_links) AS max_custom_links,
  COALESCE(sp_active.allow_analytics,     sp_free.allow_analytics)  AS allow_analytics,
  COALESCE(sp_active.allow_expiry,        sp_free.allow_expiry)     AS allow_expiry,
  COALESCE(sp_active.allow_custom_domain, sp_free.allow_custom_domain) AS allow_custom_domain,
  COALESCE(sp_active.allow_qr_code,       sp_free.allow_qr_code)   AS allow_qr_code,
  COALESCE(sp_active.reset_period,        sp_free.reset_period)     AS reset_period,
  s.id          AS subscription_id,
  s.expires_at  AS subscription_expires_at
FROM users u
LEFT JOIN LATERAL (
  SELECT * FROM subscriptions
  WHERE user_id = u.id
    AND status = 'active'
    AND expires_at > NOW()
  ORDER BY expires_at DESC
  LIMIT 1
) s ON TRUE
LEFT JOIN subscription_plans sp_active ON sp_active.id = s.plan_id
LEFT JOIN subscription_plans sp_free   ON sp_free.tier = 'free' AND sp_free.is_active = TRUE;