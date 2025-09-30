-- Migration: 012_create_tool_configs_table.sql
-- Description: Creates tool_configs table for managing tool display configurations and versions
-- Created: 2025-09-29

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tool_configs table
CREATE TABLE IF NOT EXISTS tool_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    display_mode VARCHAR(50) NOT NULL DEFAULT 'standard',
    layout_settings JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint on tool_id + version combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_configs_tool_version_unique
    ON tool_configs(tool_id, version);

-- Add unique constraint to ensure only one active config per tool
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_configs_tool_active_unique
    ON tool_configs(tool_id, is_active)
    WHERE is_active = true;

-- Add index for performance on tool_id lookups
CREATE INDEX IF NOT EXISTS idx_tool_configs_tool_id
    ON tool_configs(tool_id);

-- Add index for performance on active config lookups
CREATE INDEX IF NOT EXISTS idx_tool_configs_active
    ON tool_configs(is_active)
    WHERE is_active = true;

-- Add index for version lookups
CREATE INDEX IF NOT EXISTS idx_tool_configs_version
    ON tool_configs(version);

-- Add check constraint for display_mode enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_display_mode'
        AND conrelid = 'tool_configs'::regclass
    ) THEN
        ALTER TABLE tool_configs
            ADD CONSTRAINT check_display_mode
            CHECK (display_mode IN ('standard', 'full-width', 'compact', 'modal', 'embedded'));
    END IF;
END $$;

-- Add check constraint for semantic versioning format (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_version_format'
        AND conrelid = 'tool_configs'::regclass
    ) THEN
        ALTER TABLE tool_configs
            ADD CONSTRAINT check_version_format
            CHECK (version ~ '^\d+\.\d+\.\d+$');
    END IF;
END $$;

-- Create trigger function for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION update_tool_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_tool_configs_updated_at ON tool_configs;
CREATE TRIGGER trigger_tool_configs_updated_at
    BEFORE UPDATE ON tool_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_tool_configs_updated_at();

-- Create function to ensure only one active config per tool
CREATE OR REPLACE FUNCTION ensure_single_active_config()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a config to active
    IF NEW.is_active = true THEN
        -- Deactivate all other configs for this tool
        UPDATE tool_configs
        SET is_active = false
        WHERE tool_id = NEW.tool_id
          AND id != NEW.id
          AND is_active = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain single active config per tool
DROP TRIGGER IF EXISTS trigger_ensure_single_active_config ON tool_configs;
CREATE TRIGGER trigger_ensure_single_active_config
    BEFORE INSERT OR UPDATE ON tool_configs
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_config();

-- Add comments for documentation
COMMENT ON TABLE tool_configs IS 'Configuration settings for tools including display modes and layout preferences';
COMMENT ON COLUMN tool_configs.id IS 'Primary key (UUID)';
COMMENT ON COLUMN tool_configs.tool_id IS 'Foreign key reference to tools table';
COMMENT ON COLUMN tool_configs.version IS 'Semantic version of configuration (e.g., 1.0.0, 1.1.0)';
COMMENT ON COLUMN tool_configs.display_mode IS 'Display mode: standard, full-width, compact, modal, embedded';
COMMENT ON COLUMN tool_configs.layout_settings IS 'JSON configuration for layout (max_width, padding, margins, etc.)';
COMMENT ON COLUMN tool_configs.is_active IS 'Whether this is the active configuration for the tool (only one per tool)';
COMMENT ON COLUMN tool_configs.created_at IS 'Configuration creation timestamp';
COMMENT ON COLUMN tool_configs.updated_at IS 'Last modification timestamp (auto-updated)';

-- Create default configurations for existing tools
INSERT INTO tool_configs (tool_id, version, display_mode, layout_settings, is_active)
SELECT
    id as tool_id,
    '1.0.0' as version,
    'standard' as display_mode,
    '{"maxWidth": "1200px", "padding": "2rem"}'::jsonb as layout_settings,
    true as is_active
FROM tools
ON CONFLICT DO NOTHING;

-- Migration completed successfully
SELECT 'Tool configs table created successfully with default configurations' AS migration_status;