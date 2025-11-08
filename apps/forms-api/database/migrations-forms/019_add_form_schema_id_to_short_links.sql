-- Migration: Add form_schema_id to short_links table
-- Purpose: Link short codes directly to form schemas for public form rendering
-- Related Story: 20.7-public-form-rendering-themes.story.md

-- Add form_schema_id column to short_links table
ALTER TABLE short_links
ADD COLUMN IF NOT EXISTS form_schema_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE;

-- Add index for efficient form schema lookups
CREATE INDEX IF NOT EXISTS idx_short_links_form_schema_id ON short_links(form_schema_id) WHERE form_schema_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN short_links.form_schema_id IS 'Optional reference to form schema for form-specific short links';
