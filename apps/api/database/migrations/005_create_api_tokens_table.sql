-- Migration: 005_create_api_tokens_table.sql
-- Description: Creates api_tokens table for API token authentication system
-- Created: 2025-09-25

-- Create api_tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,

    -- Ensure token name uniqueness per user
    CONSTRAINT unique_token_name_per_user UNIQUE(user_id, name),

    -- Check constraints
    CONSTRAINT valid_token_name CHECK (
        LENGTH(name) >= 1 AND LENGTH(name) <= 100
    ),
    CONSTRAINT valid_scopes CHECK (
        array_length(scopes, 1) > 0 AND
        scopes <@ ARRAY['read', 'write']::TEXT[]
    ),
    CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_tenant_id ON api_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires_at ON api_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_tokens_active ON api_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_api_tokens_created_at ON api_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_api_tokens_last_used_at ON api_tokens(last_used_at);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_api_tokens_updated_at
    BEFORE UPDATE ON api_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE api_tokens IS 'API tokens for external system authentication';
COMMENT ON COLUMN api_tokens.id IS 'Unique identifier for the API token';
COMMENT ON COLUMN api_tokens.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN api_tokens.tenant_id IS 'Foreign key to tenants table for multi-tenancy';
COMMENT ON COLUMN api_tokens.token_hash IS 'Bcrypt hashed token value for security';
COMMENT ON COLUMN api_tokens.name IS 'User-friendly name for the token';
COMMENT ON COLUMN api_tokens.scopes IS 'Array of permissions (read, write)';
COMMENT ON COLUMN api_tokens.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN api_tokens.last_used_at IS 'Last time token was used for authentication';
COMMENT ON COLUMN api_tokens.is_active IS 'Active status flag for token';