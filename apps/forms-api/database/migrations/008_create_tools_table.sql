-- Migration: 008_create_tools_table.sql
-- Description: Creates tools table for managing globally available tools registry
-- Created: 2025-09-26

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint on key column (kebab-case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tools_key_unique ON tools(key);

-- Add index for performance on active status lookups
CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(active);

-- Add index for name lookups
CREATE INDEX IF NOT EXISTS idx_tools_name ON tools(name);

-- Create trigger function for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION update_tools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_tools_updated_at ON tools;
CREATE TRIGGER trigger_tools_updated_at
    BEFORE UPDATE ON tools
    FOR EACH ROW
    EXECUTE FUNCTION update_tools_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tools IS 'Registry of globally available tools that can be enabled/disabled by super admin';
COMMENT ON COLUMN tools.id IS 'Primary key (UUID)';
COMMENT ON COLUMN tools.key IS 'Unique identifier for tool (kebab-case, e.g. "short-link")';
COMMENT ON COLUMN tools.name IS 'Human-readable tool name';
COMMENT ON COLUMN tools.description IS 'Description of tool functionality';
COMMENT ON COLUMN tools.active IS 'Whether tool is currently enabled/disabled';
COMMENT ON COLUMN tools.created_at IS 'Tool registration timestamp';
COMMENT ON COLUMN tools.updated_at IS 'Last modification timestamp (auto-updated)';

-- Migration completed successfully
SELECT 'Tools table created successfully' AS migration_status;