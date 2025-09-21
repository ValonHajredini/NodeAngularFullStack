--
-- PostgreSQL database dump
--

\restrict ger6IfNEOYkRLfJGe49dl4W0ItIYCMRz0aEnLsiHIotq41fPYuToneDfW9dcxwX

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

\unrestrict ger6IfNEOYkRLfJGe49dl4W0ItIYCMRz0aEnLsiHIotq41fPYuToneDfW9dcxwX

