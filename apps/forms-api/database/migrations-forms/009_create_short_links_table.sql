-- Migration: Create short_links table for URL shortening tool
-- Date: 2025-09-27
-- Description: Creates the short_links table with UUID primary key, unique short codes,
--              analytics tracking, and expiration support

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create short_links table
CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(8) NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    -- User validated at application layer via SharedAuthService
    created_by UUID NULL,
    click_count INTEGER NOT NULL DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
CREATE INDEX IF NOT EXISTS idx_short_links_expires_at ON short_links(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_short_links_created_by ON short_links(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_short_links_created_at ON short_links(created_at);

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_short_links_code_length') THEN
        ALTER TABLE short_links ADD CONSTRAINT chk_short_links_code_length CHECK (length(code) >= 6 AND length(code) <= 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_short_links_code_format') THEN
        ALTER TABLE short_links ADD CONSTRAINT chk_short_links_code_format CHECK (code ~ '^[a-zA-Z0-9]+$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_short_links_url_length') THEN
        ALTER TABLE short_links ADD CONSTRAINT chk_short_links_url_length CHECK (length(original_url) <= 2048);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_short_links_click_count') THEN
        ALTER TABLE short_links ADD CONSTRAINT chk_short_links_click_count CHECK (click_count >= 0);
    END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_short_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_short_links_updated_at ON short_links;
CREATE TRIGGER trigger_short_links_updated_at
    BEFORE UPDATE ON short_links
    FOR EACH ROW
    EXECUTE FUNCTION update_short_links_updated_at();

-- Add comments for documentation
COMMENT ON TABLE short_links IS 'Stores shortened URL mappings with optional expiration and analytics';
COMMENT ON COLUMN short_links.id IS 'Primary key (UUID)';
COMMENT ON COLUMN short_links.code IS 'Unique short code (6-8 alphanumeric characters)';
COMMENT ON COLUMN short_links.original_url IS 'Original URL to redirect to (max 2048 chars)';
COMMENT ON COLUMN short_links.expires_at IS 'Optional expiration timestamp';
COMMENT ON COLUMN short_links.created_by IS 'User who created the short link (nullable)';
COMMENT ON COLUMN short_links.click_count IS 'Number of times this link has been accessed';
COMMENT ON COLUMN short_links.last_accessed IS 'Timestamp of last access';
COMMENT ON COLUMN short_links.created_at IS 'Creation timestamp';
COMMENT ON COLUMN short_links.updated_at IS 'Last modification timestamp';