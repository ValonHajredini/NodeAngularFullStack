-- Migration: 001_create_short_links_table
-- Description: Create short_links table for storing short link data
-- Author: POC Phase 0
-- Date: 2025-10-23

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    original_url TEXT NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    token VARCHAR(255),
    expires_at TIMESTAMP,
    click_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_resource_type CHECK (resource_type IN ('form', 'survey', 'svg', 'generic'))
);

-- Indexes for performance
CREATE INDEX idx_short_links_code ON short_links(short_code);
CREATE INDEX idx_short_links_user_id ON short_links(user_id);
CREATE INDEX idx_short_links_resource ON short_links(resource_type, resource_id);
CREATE INDEX idx_short_links_expires_at ON short_links(expires_at);

-- Comments for documentation
COMMENT ON TABLE short_links IS 'Stores short link mappings for all resources in the system';
COMMENT ON COLUMN short_links.user_id IS 'Foreign key to users table in platform service';
COMMENT ON COLUMN short_links.resource_type IS 'Type of resource: form, survey, svg, or generic';
COMMENT ON COLUMN short_links.resource_id IS 'ID of the resource (e.g., form_schema_id)';
COMMENT ON COLUMN short_links.short_code IS 'Unique short code for URL (e.g., "aB3xY9z2")';
COMMENT ON COLUMN short_links.token IS 'Optional JWT token for private forms';
COMMENT ON COLUMN short_links.expires_at IS 'Expiration timestamp, NULL means never expires';
COMMENT ON COLUMN short_links.click_count IS 'Number of times this link has been accessed';
