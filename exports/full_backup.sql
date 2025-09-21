--
-- PostgreSQL database dump
--

\restrict 307LJvJJYoTeGEb6aqJDWB3guOoTdL1pTILgiSjFPjquM6hlcdnjGqAO4PDJsqU

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_expired_password_resets(); Type: FUNCTION; Schema: public; Owner: dbuser
--

CREATE FUNCTION public.cleanup_expired_password_resets() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_resets
    WHERE expires_at < CURRENT_TIMESTAMP OR used = true;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_password_resets() OWNER TO dbuser;

--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: dbuser
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_sessions() OWNER TO dbuser;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: dbuser
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO dbuser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: dbuser
--

CREATE TABLE public.password_resets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_reset_expiry CHECK ((expires_at > created_at))
);


ALTER TABLE public.password_resets OWNER TO dbuser;

--
-- Name: TABLE password_resets; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON TABLE public.password_resets IS 'Password reset tokens with expiration and usage tracking';


--
-- Name: COLUMN password_resets.token; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.password_resets.token IS 'Secure random token for password reset verification';


--
-- Name: COLUMN password_resets.used; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.password_resets.used IS 'Flag to prevent token reuse';


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: dbuser
--

CREATE TABLE public.sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(500) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_expiry CHECK ((expires_at > created_at))
);


ALTER TABLE public.sessions OWNER TO dbuser;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON TABLE public.sessions IS 'User sessions for refresh token management and tracking';


--
-- Name: COLUMN sessions.refresh_token; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.sessions.refresh_token IS 'JWT refresh token for session management';


--
-- Name: COLUMN sessions.expires_at; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.sessions.expires_at IS 'Session expiration timestamp for cleanup';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: dbuser
--

CREATE TABLE public.tenants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenants OWNER TO dbuser;

--
-- Name: TABLE tenants; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON TABLE public.tenants IS 'Tenant organizations for multi-tenancy support';


--
-- Name: users; Type: TABLE; Schema: public; Owner: dbuser
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp with time zone,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    CONSTRAINT valid_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT valid_names CHECK (((length((first_name)::text) >= 1) AND (length((first_name)::text) <= 100) AND (length((last_name)::text) >= 1) AND (length((last_name)::text) <= 100))),
    CONSTRAINT valid_role CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying, 'readonly'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO dbuser;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON TABLE public.users IS 'User accounts with authentication and profile information';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.users.email IS 'Unique email address per tenant, used for authentication';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hashed password with salt rounds 12+';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: dbuser
--

COMMENT ON COLUMN public.users.role IS 'User role for authorization (admin, user, readonly)';


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: dbuser
--

COPY public.password_resets (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: dbuser
--

COPY public.sessions (id, user_id, refresh_token, expires_at, ip_address, user_agent, created_at) FROM stdin;
7f3f92c7-1180-4cbd-8bcd-01bc436f7714	4e6d2122-48f1-4a0d-9784-9592eea73fc5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZTZkMjEyMi00OGYxLTRhMGQtOTc4NC05NTkyZWVhNzNmYzUiLCJzZXNzaW9uSWQiOiI0ZjBhZjBkOC00YTU4LTQ5N2YtYWZiMy04MGQ3ZWY0MzA4OGYiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc1ODQwODcwMiwiZXhwIjoxNzU5MDEzNTAyLCJhdWQiOiJub2RlYW5ndWxhcmZ1bGxzdGFjay1jbGllbnQiLCJpc3MiOiJub2RlYW5ndWxhcmZ1bGxzdGFjay1hcGkifQ.Pekm0p8F3FFoSe8a3d8zFQXt9AyAr8W9eFsOyWXg06w	2025-09-27 22:51:42.211+00	::ffff:127.0.0.1	\N	2025-09-20 22:51:42.210757+00
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: dbuser
--

COPY public.tenants (id, name, slug, settings, is_active, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000000	Default Tenant	default	{}	t	2025-09-20 13:08:58.604486+00	2025-09-20 13:08:58.604486+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dbuser
--

COPY public.users (id, tenant_id, email, password_hash, first_name, last_name, role, created_at, updated_at, last_login, is_active, email_verified) FROM stdin;
4e6d2122-48f1-4a0d-9784-9592eea73fc5	\N	reset-test@example.com	$2b$12$O0ffyR2RzJTiVD6uMj.GkuDb/yJW0usJ.QhhtXyOkj8Lp6D68SpwG	Reset	Test	user	2025-09-20 22:51:42.2075+00	2025-09-20 22:51:42.2075+00	\N	t	f
ddf68dcd-8c87-48c4-a716-793ae1f558a1	\N	unverified@example.com	$2b$12$HyMqjHsQeD3R2k4.sLBJL.CbEYGOM9kEoDNXIEp7cqdqVDt0p3O7W	Unverified	User	user	2025-09-20 14:20:19.472269+00	2025-09-20 14:20:19.472269+00	\N	t	f
33ff5018-e490-4416-9262-c05a521f3133	\N	naxa@mailinator.com	$2b$12$vDQvnhV7WSWCpH5CUyNFQuJSe7qmWXo3lpTQnQ/jUHs9bAMZP1Vke	Avram	Wiggins	user	2025-09-20 20:45:00.517666+00	2025-09-20 20:46:23.870364+00	2025-09-20 20:46:23.870364+00	t	f
6e29c207-6155-4950-b26b-806be11c0f52	\N	user@example.com	$2b$12$8fIpMOE.U15O/vPTJZxgPOCI8G5xGC2CNkdtuMhMiRHd9.SYnIYmC	Regular	User	user	2025-09-20 14:20:18.643998+00	2025-09-20 20:59:57.811169+00	2025-09-20 20:59:57.811169+00	t	t
f2ddde50-fbac-4eb5-ac69-3e3a63c95e91	\N	inactive@example.com	$2b$12$jMyGBU1QuaUr7//bwP0s3OTiEdm/9TSC5nXdoHwSyvbPSGsn4oj8O	Inactive	User	user	2025-09-20 14:20:19.211959+00	2025-09-20 21:20:35.778399+00	\N	t	t
34677e8a-6fb0-4926-99ab-971b55da0c57	\N	sodonuty@mailinator.com	$2b$12$qguHrCyoma63vFbg6H0TiOa9zrvxZtPhZPRG6VpmoHSxSSaj3CPdi	Hammett	Gutierrez	user	2025-09-20 20:59:22.211827+00	2025-09-20 21:21:20.245082+00	\N	t	t
479a4665-d66b-42e8-99d3-e38f4d2d6485	\N	readonly@example.com	$2b$12$V5y3BviLmK9j0f5cJBnnSOwS/Yu9NRKxKe3gwaT2VylpEv1EiQMPi	Readonly	User	readonly	2025-09-20 14:20:18.904717+00	2025-09-20 21:22:57.95117+00	2025-09-20 21:22:57.95117+00	t	t
03d53aba-ff14-4e68-9826-035257d27ac0	\N	admin@example.com	$2b$12$DRxM3GuQj0lRaRV/3xJlHOnuFYqFQwL0rLbblfU870NMlLfMzOMcy	Admin	User	admin	2025-09-20 14:20:18.383529+00	2025-09-20 22:34:04.804304+00	2025-09-20 22:34:04.804304+00	t	t
\.


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_refresh_token_key UNIQUE (refresh_token);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users unique_email_per_tenant; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_email_per_tenant UNIQUE (email, tenant_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_password_resets_expires_at; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_password_resets_expires_at ON public.password_resets USING btree (expires_at);


--
-- Name: idx_password_resets_token; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_password_resets_token ON public.password_resets USING btree (token);


--
-- Name: idx_password_resets_used; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_password_resets_used ON public.password_resets USING btree (used);


--
-- Name: idx_password_resets_user_id; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_password_resets_user_id ON public.password_resets USING btree (user_id);


--
-- Name: idx_sessions_created_at; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_sessions_created_at ON public.sessions USING btree (created_at);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_ip_address; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_sessions_ip_address ON public.sessions USING btree (ip_address);


--
-- Name: idx_sessions_refresh_token; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_sessions_refresh_token ON public.sessions USING btree (refresh_token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_tenants_active; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_tenants_active ON public.tenants USING btree (is_active);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_tenant; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_email_tenant ON public.users USING btree (email, tenant_id);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: dbuser
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: dbuser
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: dbuser
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dbuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 307LJvJJYoTeGEb6aqJDWB3guOoTdL1pTILgiSjFPjquM6hlcdnjGqAO4PDJsqU

