-- Migration: 001_create_auth_tables.sql
-- Description: Creates users, sessions, and password_resets tables for JWT authentication system
-- Created: 2025-09-20

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table (for multi-tenancy support)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,

    -- Ensure email uniqueness per tenant (or globally if no tenant)
    CONSTRAINT unique_email_per_tenant UNIQUE(email, tenant_id),

    -- Check constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'user', 'readonly')),
    CONSTRAINT valid_names CHECK (
        LENGTH(first_name) >= 1 AND LENGTH(first_name) <= 100 AND
        LENGTH(last_name) >= 1 AND LENGTH(last_name) <= 100
    )
);

-- Create sessions table for refresh token management
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Check constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create password_resets table for password reset functionality
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Check constraints
    CONSTRAINT valid_reset_expiry CHECK (expires_at > created_at)
);

-- Create indexes for optimal query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_ip_address ON sessions(ip_address);

-- Password resets table indexes
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_used ON password_resets(used);

-- Tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist to keep migration idempotent
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;

-- Create triggers to automatically update updated_at on record changes
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for session cleanup (remove expired sessions)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE 'plpgsql';

-- Create function for password reset cleanup (remove expired/used tokens)
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_resets
    WHERE expires_at < CURRENT_TIMESTAMP OR used = true;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE 'plpgsql';

-- Insert default tenant for single-tenant mode (optional)
INSERT INTO tenants (id, name, slug, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Default Tenant',
    'default',
    true
) ON CONFLICT (id) DO NOTHING;

-- Create admin user for development (remove in production)
-- Password: AdminPass123! (hashed with bcrypt salt rounds 12)
-- INSERT INTO users (
--     tenant_id,
--     email,
--     password_hash,
--     first_name,
--     last_name,
--     role,
--     email_verified
-- ) VALUES (
--     NULL, -- Single tenant mode
--     'admin@example.com',
--     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK', -- AdminPass123!
--     'Admin',
--     'User',
--     'admin',
--     true
-- ) ON CONFLICT (email, tenant_id) DO NOTHING;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO legopdf_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO legopdf_user;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication and profile information';
COMMENT ON TABLE sessions IS 'User sessions for refresh token management and tracking';
COMMENT ON TABLE password_resets IS 'Password reset tokens with expiration and usage tracking';
COMMENT ON TABLE tenants IS 'Tenant organizations for multi-tenancy support';

COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password with salt rounds 12+';
COMMENT ON COLUMN users.email IS 'Unique email address per tenant, used for authentication';
COMMENT ON COLUMN users.role IS 'User role for authorization (admin, user, readonly)';
COMMENT ON COLUMN sessions.refresh_token IS 'JWT refresh token for session management';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp for cleanup';
COMMENT ON COLUMN password_resets.token IS 'Secure random token for password reset verification';
COMMENT ON COLUMN password_resets.used IS 'Flag to prevent token reuse';

-- Migration completed successfully
SELECT 'Authentication tables created successfully' AS migration_status;
