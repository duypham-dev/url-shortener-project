--
-- PostgreSQL database dump
--

\restrict A8d50ux842ufz4xwHMfuBHb3wfMp8zGs43kdgAzfKfMzPk2GroKAvhAFdkt0T49

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: shortlink; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA shortlink;


ALTER SCHEMA shortlink OWNER TO postgres;

--
-- Name: InteractionType; Type: TYPE; Schema: shortlink; Owner: postgres
--

CREATE TYPE shortlink."InteractionType" AS ENUM (
    'CLICK',
    'SCAN'
);


ALTER TYPE shortlink."InteractionType" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: shortlink; Owner: postgres
--

CREATE TYPE shortlink."PaymentStatus" AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE shortlink."PaymentStatus" OWNER TO postgres;

--
-- Name: PlanTier; Type: TYPE; Schema: shortlink; Owner: postgres
--

CREATE TYPE shortlink."PlanTier" AS ENUM (
    'free',
    'basic',
    'premium',
    'enterprise'
);


ALTER TYPE shortlink."PlanTier" OWNER TO postgres;

--
-- Name: ResetPeriod; Type: TYPE; Schema: shortlink; Owner: postgres
--

CREATE TYPE shortlink."ResetPeriod" AS ENUM (
    'never',
    'monthly',
    'yearly'
);


ALTER TYPE shortlink."ResetPeriod" OWNER TO postgres;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: shortlink; Owner: postgres
--

CREATE TYPE shortlink."SubscriptionStatus" AS ENUM (
    'pending',
    'active',
    'expired',
    'cancelled'
);


ALTER TYPE shortlink."SubscriptionStatus" OWNER TO postgres;

--
-- Name: increment_monthly_link_usage(); Type: FUNCTION; Schema: shortlink; Owner: postgres
--

CREATE FUNCTION shortlink.increment_monthly_link_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "shortlink"."user_link_monthly_usage" (user_id, year_month, link_count, custom_link_count)
  VALUES (
    NEW.user_id,
    TO_CHAR(NOW(), 'YYYY-MM'),
    1,
    CASE WHEN NEW.is_custom THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, year_month) DO UPDATE SET
    link_count        = "user_link_monthly_usage".link_count + 1,
    custom_link_count = "user_link_monthly_usage".custom_link_count
                        + CASE WHEN NEW.is_custom THEN 1 ELSE 0 END;
  RETURN NEW;
END;
$$;


ALTER FUNCTION shortlink.increment_monthly_link_usage() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE shortlink._prisma_migrations OWNER TO postgres;

--
-- Name: click_logs; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.click_logs (
    id bigint NOT NULL,
    short_code character varying(10) NOT NULL,
    clicked_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text,
    referrer character varying(255),
    country character varying(100),
    browser character varying(50),
    device_type character varying(50),
    os character varying(50),
    url_mapping_id bigint NOT NULL,
    user_id integer,
    interaction_type shortlink."InteractionType" DEFAULT 'CLICK'::shortlink."InteractionType" NOT NULL
);


ALTER TABLE shortlink.click_logs OWNER TO postgres;

--
-- Name: click_logs_id_seq; Type: SEQUENCE; Schema: shortlink; Owner: postgres
--

CREATE SEQUENCE shortlink.click_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shortlink.click_logs_id_seq OWNER TO postgres;

--
-- Name: click_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: shortlink; Owner: postgres
--

ALTER SEQUENCE shortlink.click_logs_id_seq OWNED BY shortlink.click_logs.id;


--
-- Name: payments; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.payments (
    id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    subscription_id character varying(255),
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    status shortlink."PaymentStatus" DEFAULT 'pending'::shortlink."PaymentStatus" NOT NULL,
    provider character varying(50) NOT NULL,
    provider_tx_id character varying(255),
    provider_payload jsonb,
    paid_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE shortlink.payments OWNER TO postgres;

--
-- Name: qr_codes; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.qr_codes (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    url_mapping_id bigint NOT NULL,
    destination_url text NOT NULL,
    short_code character varying(10),
    title character varying(255),
    fg_color character varying(7) DEFAULT '#000000'::character varying NOT NULL,
    bg_color character varying(7) DEFAULT '#ffffff'::character varying NOT NULL,
    error_correction character varying(1) DEFAULT 'Q'::character varying NOT NULL,
    size integer DEFAULT 300 NOT NULL,
    cloudinary_public_id character varying(255),
    cloudinary_url text,
    is_active boolean DEFAULT true NOT NULL,
    scan_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE shortlink.qr_codes OWNER TO postgres;

--
-- Name: qr_codes_id_seq; Type: SEQUENCE; Schema: shortlink; Owner: postgres
--

CREATE SEQUENCE shortlink.qr_codes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shortlink.qr_codes_id_seq OWNER TO postgres;

--
-- Name: qr_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: shortlink; Owner: postgres
--

ALTER SEQUENCE shortlink.qr_codes_id_seq OWNED BY shortlink.qr_codes.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.subscription_plans (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    tier shortlink."PlanTier" DEFAULT 'basic'::shortlink."PlanTier" NOT NULL,
    duration_days integer DEFAULT 30 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    max_links integer DEFAULT 5 NOT NULL,
    max_custom_links integer DEFAULT 0 NOT NULL,
    reset_period shortlink."ResetPeriod" DEFAULT 'monthly'::shortlink."ResetPeriod" NOT NULL,
    allow_analytics boolean DEFAULT false NOT NULL,
    allow_expiry boolean DEFAULT false NOT NULL,
    allow_custom_domain boolean DEFAULT false NOT NULL,
    allow_qr_code boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    max_qr_codes integer DEFAULT 0 NOT NULL
);


ALTER TABLE shortlink.subscription_plans OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: shortlink; Owner: postgres
--

CREATE SEQUENCE shortlink.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shortlink.subscription_plans_id_seq OWNER TO postgres;

--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: shortlink; Owner: postgres
--

ALTER SEQUENCE shortlink.subscription_plans_id_seq OWNED BY shortlink.subscription_plans.id;


--
-- Name: subscriptions; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.subscriptions (
    id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    plan_id integer NOT NULL,
    status shortlink."SubscriptionStatus" DEFAULT 'pending'::shortlink."SubscriptionStatus" NOT NULL,
    started_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE shortlink.subscriptions OWNER TO postgres;

--
-- Name: url_mappings; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.url_mappings (
    id bigint NOT NULL,
    short_code character varying(10),
    long_url text NOT NULL,
    user_id integer NOT NULL,
    title character varying(255),
    is_custom boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) with time zone,
    has_qr boolean DEFAULT false NOT NULL,
    is_qr_only boolean DEFAULT false NOT NULL
);


ALTER TABLE shortlink.url_mappings OWNER TO postgres;

--
-- Name: url_mappings_id_seq; Type: SEQUENCE; Schema: shortlink; Owner: postgres
--

CREATE SEQUENCE shortlink.url_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shortlink.url_mappings_id_seq OWNER TO postgres;

--
-- Name: url_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: shortlink; Owner: postgres
--

ALTER SEQUENCE shortlink.url_mappings_id_seq OWNED BY shortlink.url_mappings.id;


--
-- Name: users; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE shortlink.users OWNER TO postgres;

--
-- Name: user_active_plan; Type: VIEW; Schema: shortlink; Owner: postgres
--

CREATE VIEW shortlink.user_active_plan AS
 SELECT u.id AS user_id,
    COALESCE(sp_active.id, sp_free.id) AS plan_id,
    COALESCE(sp_active.name, sp_free.name) AS plan_name,
    COALESCE(sp_active.tier, sp_free.tier) AS plan_tier,
    COALESCE(sp_active.max_links, sp_free.max_links) AS max_links,
    COALESCE(sp_active.max_custom_links, sp_free.max_custom_links) AS max_custom_links,
    COALESCE(sp_active.allow_analytics, sp_free.allow_analytics) AS allow_analytics,
    COALESCE(sp_active.allow_expiry, sp_free.allow_expiry) AS allow_expiry,
    COALESCE(sp_active.allow_custom_domain, sp_free.allow_custom_domain) AS allow_custom_domain,
    COALESCE(sp_active.allow_qr_code, sp_free.allow_qr_code) AS allow_qr_code,
    COALESCE(sp_active.reset_period, sp_free.reset_period) AS reset_period,
    s.id AS subscription_id,
    s.expires_at AS subscription_expires_at
   FROM (((shortlink.users u
     LEFT JOIN LATERAL ( SELECT subscriptions.id,
            subscriptions.user_id,
            subscriptions.plan_id,
            subscriptions.status,
            subscriptions.started_at,
            subscriptions.expires_at,
            subscriptions.created_at
           FROM shortlink.subscriptions
          WHERE ((subscriptions.user_id = u.id) AND (subscriptions.status = 'active'::shortlink."SubscriptionStatus") AND (subscriptions.expires_at > now()))
          ORDER BY subscriptions.expires_at DESC
         LIMIT 1) s ON (true))
     LEFT JOIN shortlink.subscription_plans sp_active ON ((sp_active.id = s.plan_id)))
     LEFT JOIN shortlink.subscription_plans sp_free ON (((sp_free.tier = 'free'::shortlink."PlanTier") AND (sp_free.is_active = true))));


ALTER VIEW shortlink.user_active_plan OWNER TO postgres;

--
-- Name: user_link_monthly_usage; Type: TABLE; Schema: shortlink; Owner: postgres
--

CREATE TABLE shortlink.user_link_monthly_usage (
    user_id integer NOT NULL,
    year_month character(7) NOT NULL,
    link_count integer DEFAULT 0 NOT NULL,
    custom_link_count integer DEFAULT 0 NOT NULL,
    qr_code_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE shortlink.user_link_monthly_usage OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: shortlink; Owner: postgres
--

CREATE SEQUENCE shortlink.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE shortlink.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: shortlink; Owner: postgres
--

ALTER SEQUENCE shortlink.users_id_seq OWNED BY shortlink.users.id;


--
-- Name: click_logs id; Type: DEFAULT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.click_logs ALTER COLUMN id SET DEFAULT nextval('shortlink.click_logs_id_seq'::regclass);


--
-- Name: qr_codes id; Type: DEFAULT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.qr_codes ALTER COLUMN id SET DEFAULT nextval('shortlink.qr_codes_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscription_plans ALTER COLUMN id SET DEFAULT nextval('shortlink.subscription_plans_id_seq'::regclass);


--
-- Name: url_mappings id; Type: DEFAULT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.url_mappings ALTER COLUMN id SET DEFAULT nextval('shortlink.url_mappings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.users ALTER COLUMN id SET DEFAULT nextval('shortlink.users_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: click_logs click_logs_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.click_logs
    ADD CONSTRAINT click_logs_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: qr_codes qr_codes_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.qr_codes
    ADD CONSTRAINT qr_codes_pkey PRIMARY KEY (id);


--
-- Name: qr_codes qr_codes_url_mapping_id_key; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.qr_codes
    ADD CONSTRAINT qr_codes_url_mapping_id_key UNIQUE (url_mapping_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: url_mappings url_mappings_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.url_mappings
    ADD CONSTRAINT url_mappings_pkey PRIMARY KEY (id);


--
-- Name: user_link_monthly_usage user_link_monthly_usage_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.user_link_monthly_usage
    ADD CONSTRAINT user_link_monthly_usage_pkey PRIMARY KEY (user_id, year_month);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_logs_by_link; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_logs_by_link ON shortlink.click_logs USING btree (short_code, clicked_at DESC);


--
-- Name: idx_logs_interaction_type; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_logs_interaction_type ON shortlink.click_logs USING btree (url_mapping_id, interaction_type);


--
-- Name: idx_logs_realtime_stream; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_logs_realtime_stream ON shortlink.click_logs USING btree (user_id, clicked_at DESC);


--
-- Name: idx_payments_created; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_payments_created ON shortlink.payments USING btree (created_at DESC);


--
-- Name: idx_payments_provider; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_payments_provider ON shortlink.payments USING btree (provider_tx_id) WHERE (provider_tx_id IS NOT NULL);


--
-- Name: idx_payments_status; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_payments_status ON shortlink.payments USING btree (status);


--
-- Name: idx_payments_user; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_payments_user ON shortlink.payments USING btree (user_id);


--
-- Name: idx_qr_short_code; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_qr_short_code ON shortlink.qr_codes USING btree (short_code);


--
-- Name: idx_qr_url_mapping; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_qr_url_mapping ON shortlink.qr_codes USING btree (url_mapping_id);


--
-- Name: idx_qr_user_created; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_qr_user_created ON shortlink.qr_codes USING btree (user_id, created_at DESC);


--
-- Name: idx_subscriptions_expires; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_subscriptions_expires ON shortlink.subscriptions USING btree (expires_at) WHERE (status = 'active'::shortlink."SubscriptionStatus");


--
-- Name: idx_subscriptions_user_status; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_subscriptions_user_status ON shortlink.subscriptions USING btree (user_id, status);


--
-- Name: idx_url_expires_at; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_url_expires_at ON shortlink.url_mappings USING btree (expires_at);


--
-- Name: idx_url_long_url; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_url_long_url ON shortlink.url_mappings USING btree (long_url, user_id) WHERE ((is_custom = false) AND (is_active = true));


--
-- Name: idx_url_qr_only; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_url_qr_only ON shortlink.url_mappings USING btree (user_id, is_qr_only);


--
-- Name: idx_url_user_id; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE INDEX idx_url_user_id ON shortlink.url_mappings USING btree (user_id);


--
-- Name: payments_provider_tx_id_key; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE UNIQUE INDEX payments_provider_tx_id_key ON shortlink.payments USING btree (provider_tx_id);


--
-- Name: url_mappings_short_code_key; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE UNIQUE INDEX url_mappings_short_code_key ON shortlink.url_mappings USING btree (short_code);


--
-- Name: users_email_key; Type: INDEX; Schema: shortlink; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON shortlink.users USING btree (email);


--
-- Name: url_mappings trg_link_usage; Type: TRIGGER; Schema: shortlink; Owner: postgres
--

CREATE TRIGGER trg_link_usage AFTER INSERT ON shortlink.url_mappings FOR EACH ROW EXECUTE FUNCTION shortlink.increment_monthly_link_usage();


--
-- Name: click_logs click_logs_url_mapping_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.click_logs
    ADD CONSTRAINT click_logs_url_mapping_id_fkey FOREIGN KEY (url_mapping_id) REFERENCES shortlink.url_mappings(id) ON DELETE CASCADE;


--
-- Name: click_logs click_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.click_logs
    ADD CONSTRAINT click_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES shortlink.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES shortlink.subscriptions(id);


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES shortlink.users(id);


--
-- Name: qr_codes qr_codes_url_mapping_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.qr_codes
    ADD CONSTRAINT qr_codes_url_mapping_id_fkey FOREIGN KEY (url_mapping_id) REFERENCES shortlink.url_mappings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_codes qr_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.qr_codes
    ADD CONSTRAINT qr_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES shortlink.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES shortlink.subscription_plans(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES shortlink.users(id) ON DELETE CASCADE;


--
-- Name: url_mappings url_mappings_user_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.url_mappings
    ADD CONSTRAINT url_mappings_user_id_fkey FOREIGN KEY (user_id) REFERENCES shortlink.users(id) ON DELETE CASCADE;


--
-- Name: user_link_monthly_usage user_link_monthly_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.user_link_monthly_usage
    ADD CONSTRAINT user_link_monthly_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES shortlink.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict A8d50ux842ufz4xwHMfuBHb3wfMp8zGs43kdgAzfKfMzPk2GroKAvhAFdkt0T49

