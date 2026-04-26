--
-- PostgreSQL database dump
--

\restrict YseEtbV7qk2SK2gzlwmCFvsTVfquRtw7XUdah6JXR9wGCPlIIALh3VSdbdsUEsQ

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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
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
-- Name: subscription_plans id; Type: DEFAULT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscription_plans ALTER COLUMN id SET DEFAULT nextval('shortlink.subscription_plans_id_seq'::regclass);


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: shortlink; Owner: postgres
--

COPY shortlink.subscription_plans (id, name, tier, duration_days, price, currency, max_links, max_custom_links, reset_period, allow_analytics, allow_expiry, allow_custom_domain, allow_qr_code, is_active, sort_order, created_at) FROM stdin;
5	Gói Cơ Bản (Basic)	basic	30	49000.00	VND	500	50	monthly	t	f	f	t	t	2	2026-04-20 15:39:43.63+07
6	Gói Cao Cấp (Premium)	premium	30	99000.00	VND	5000	500	monthly	t	f	t	t	t	3	2026-04-20 15:39:43.63+07
7	Gói Doanh Nghiệp (Enterprise)	enterprise	30	199000.00	VND	50000	5000	monthly	t	t	t	t	t	4	2026-04-20 15:39:43.63+07
4	Gói Miễn Phí (Free)	free	30	0.00	VND	5	0	monthly	f	f	f	t	t	1	2026-04-20 15:39:43.63+07
\.


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: shortlink; Owner: postgres
--

SELECT pg_catalog.setval('shortlink.subscription_plans_id_seq', 7, true);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: shortlink; Owner: postgres
--

ALTER TABLE ONLY shortlink.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict YseEtbV7qk2SK2gzlwmCFvsTVfquRtw7XUdah6JXR9wGCPlIIALh3VSdbdsUEsQ

