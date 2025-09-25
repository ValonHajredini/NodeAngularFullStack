-- Migration: Create API token usage tracking table
-- Created: 2025-09-25
-- Purpose: Track API token usage for monitoring and analytics

-- Create api_token_usage table for tracking token usage
CREATE TABLE IF NOT EXISTS api_token_usage (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to api_tokens table
    token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,

    -- Request details
    endpoint VARCHAR(512) NOT NULL,
    method VARCHAR(10) NOT NULL,

    -- Timing information
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processing_time INTEGER, -- Response time in milliseconds

    -- Response information
    response_status INTEGER NOT NULL,

    -- Client information
    ip_address INET,
    user_agent TEXT,

    -- Optional tenant context for multi-tenancy
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_token_usage_token_id ON api_token_usage(token_id);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_timestamp ON api_token_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_endpoint ON api_token_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_token_usage_token_timestamp ON api_token_usage(token_id, timestamp DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_api_token_usage_tenant_token_timestamp
ON api_token_usage(tenant_id, token_id, timestamp DESC)
WHERE tenant_id IS NOT NULL;

-- Performance index for status code filtering
CREATE INDEX IF NOT EXISTS idx_api_token_usage_success_failure
ON api_token_usage(token_id, response_status, timestamp DESC);

-- Add table comment for documentation
COMMENT ON TABLE api_token_usage IS 'Tracks API token usage for monitoring and analytics';
COMMENT ON COLUMN api_token_usage.id IS 'Unique identifier for usage record';
COMMENT ON COLUMN api_token_usage.token_id IS 'Foreign key reference to api_tokens table';
COMMENT ON COLUMN api_token_usage.endpoint IS 'API endpoint that was accessed';
COMMENT ON COLUMN api_token_usage.method IS 'HTTP method used (GET, POST, etc.)';
COMMENT ON COLUMN api_token_usage.timestamp IS 'When the API request was made';
COMMENT ON COLUMN api_token_usage.processing_time IS 'Request processing time in milliseconds';
COMMENT ON COLUMN api_token_usage.response_status IS 'HTTP response status code';
COMMENT ON COLUMN api_token_usage.ip_address IS 'Client IP address';
COMMENT ON COLUMN api_token_usage.user_agent IS 'Client user agent string';
COMMENT ON COLUMN api_token_usage.tenant_id IS 'Optional tenant context for multi-tenancy';

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE api_token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see usage for their own tokens
CREATE POLICY api_token_usage_tenant_isolation ON api_token_usage
    FOR ALL
    TO authenticated
    USING (
        CASE
            WHEN current_setting('app.current_tenant_id', true) IS NOT NULL
            THEN tenant_id = current_setting('app.current_tenant_id', true)::UUID
            ELSE tenant_id IS NULL
        END
        AND token_id IN (
            SELECT id FROM api_tokens
            WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- Create a function to clean up old usage records (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_api_token_usage(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_token_usage
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function comment
COMMENT ON FUNCTION cleanup_old_api_token_usage(INTEGER) IS 'Cleanup old API token usage records older than specified retention period';