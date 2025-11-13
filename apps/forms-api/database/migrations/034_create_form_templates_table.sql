-- Migration: 030_create_form_templates_table.sql
-- Description: Creates form_templates table for Form Template System with business logic configuration
-- Epic: 29 - Form Template System with Business Logic
-- Story: 29.1 - Database Schema and Template Storage Foundation
-- Created: 2025-01-09

-- Create form_templates table for template storage
-- Note: gen_random_uuid() is built-in to PostgreSQL 13+ (no extension required)
CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    preview_image_url TEXT,
    template_schema JSONB NOT NULL,
    business_logic_config JSONB,
    created_by UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_form_templates_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- CHECK constraints
    CONSTRAINT check_form_templates_category CHECK (
        category IN ('ecommerce', 'services', 'data_collection', 'events', 'quiz', 'polls')
    ),
    CONSTRAINT check_form_templates_schema_size CHECK (
        pg_column_size(template_schema) <= 102400
    ),
    CONSTRAINT check_form_templates_name_length CHECK (
        LENGTH(name) >= 1 AND LENGTH(name) <= 255
    ),
    CONSTRAINT check_form_templates_usage_count CHECK (
        usage_count >= 0
    )
);

-- Create B-tree index for active status filtering
-- Optimizes queries filtering for active templates only
CREATE INDEX IF NOT EXISTS idx_templates_is_active
    ON form_templates (is_active) WHERE is_active = true;

-- Create B-tree index for category column
-- Optimizes queries filtering by category enum value
CREATE INDEX IF NOT EXISTS idx_templates_category
    ON form_templates (category);

-- Create B-tree index for usage count sorting
-- Optimizes queries ordering by popularity
CREATE INDEX IF NOT EXISTS idx_templates_usage_count
    ON form_templates (usage_count DESC);

-- Create B-tree index for created_by foreign key
CREATE INDEX IF NOT EXISTS idx_templates_created_by
    ON form_templates (created_by) WHERE created_by IS NOT NULL;

-- Create trigger for automatic updated_at updates on form_templates
DROP TRIGGER IF EXISTS trigger_form_templates_updated_at ON form_templates;
CREATE TRIGGER trigger_form_templates_updated_at
    BEFORE UPDATE ON form_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for form_templates table
COMMENT ON TABLE form_templates IS 'Form templates with business logic configuration for rapid form creation';
COMMENT ON COLUMN form_templates.id IS 'Primary key (UUID)';
COMMENT ON COLUMN form_templates.name IS 'Template display name (max 255 chars)';
COMMENT ON COLUMN form_templates.description IS 'Optional template description';
COMMENT ON COLUMN form_templates.category IS 'Template category: ecommerce, services, data_collection, events, quiz, polls';
COMMENT ON COLUMN form_templates.preview_image_url IS 'URL for template preview image';
COMMENT ON COLUMN form_templates.template_schema IS 'JSONB column storing form schema (max 100KB)';
COMMENT ON COLUMN form_templates.business_logic_config IS 'JSONB column storing business logic configuration';
COMMENT ON COLUMN form_templates.created_by IS 'UUID reference to users(id), nullable';
COMMENT ON COLUMN form_templates.is_active IS 'Soft-delete flag (default true)';
COMMENT ON COLUMN form_templates.usage_count IS 'Count of times template has been used (default 0)';
COMMENT ON COLUMN form_templates.created_at IS 'Template creation timestamp';
COMMENT ON COLUMN form_templates.updated_at IS 'Last modification timestamp (auto-updated)';

-- Migration completed successfully
SELECT 'Form templates table created successfully' AS migration_status;
