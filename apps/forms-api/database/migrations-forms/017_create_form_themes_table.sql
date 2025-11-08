-- Migration: 017_create_form_themes_table.sql
-- Description: Creates form_themes table for Form Builder Theme System
-- Created: 2025-01-15

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create form_themes table for theme storage
CREATE TABLE IF NOT EXISTS form_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    theme_config JSONB NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- User validated at application layer via SharedAuthService
    -- NOTE: No DB foreign key due to multi-database architecture

    -- Constraints
    CONSTRAINT check_form_themes_name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
    CONSTRAINT check_form_themes_usage_count CHECK (usage_count >= 0),
    CONSTRAINT check_form_themes_thumbnail_url_length CHECK (thumbnail_url IS NULL OR LENGTH(thumbnail_url) <= 500)
);

-- Create indexes for form_themes table
CREATE INDEX IF NOT EXISTS idx_form_themes_usage ON form_themes(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_form_themes_active ON form_themes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_form_themes_created_by ON form_themes(created_by) WHERE created_by IS NOT NULL;

-- Create trigger for automatic updated_at updates on form_themes
DROP TRIGGER IF EXISTS trigger_form_themes_updated_at ON form_themes;
CREATE TRIGGER trigger_form_themes_updated_at
    BEFORE UPDATE ON form_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for form_themes table
COMMENT ON TABLE form_themes IS 'Form styling themes with responsive configuration';
COMMENT ON COLUMN form_themes.id IS 'Primary key (UUID)';
COMMENT ON COLUMN form_themes.name IS 'Theme display name (max 100 chars)';
COMMENT ON COLUMN form_themes.description IS 'Optional theme description';
COMMENT ON COLUMN form_themes.thumbnail_url IS 'DigitalOcean Spaces URL for thumbnail image (max 500 chars)';
COMMENT ON COLUMN form_themes.theme_config IS 'JSONB column storing responsive theme properties';
COMMENT ON COLUMN form_themes.usage_count IS 'Aggregate count of theme applications (default 0)';
COMMENT ON COLUMN form_themes.is_active IS 'Soft-delete flag (default true)';
COMMENT ON COLUMN form_themes.created_by IS 'UUID reference to users(id), nullable';
COMMENT ON COLUMN form_themes.created_at IS 'Theme creation timestamp';
COMMENT ON COLUMN form_themes.updated_at IS 'Last modification timestamp (auto-updated)';

-- Migration completed successfully
SELECT 'Form themes table created successfully' AS migration_status;
