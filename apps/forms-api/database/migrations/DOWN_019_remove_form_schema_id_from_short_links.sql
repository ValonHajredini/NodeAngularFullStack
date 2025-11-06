-- Rollback Migration: Remove form_schema_id from short_links table
-- Purpose: Revert form schema linking from short links
-- Related Story: 20.7-public-form-rendering-themes.story.md

-- Drop index
DROP INDEX IF EXISTS idx_short_links_form_schema_id;

-- Remove form_schema_id column from short_links table
ALTER TABLE short_links
DROP COLUMN IF EXISTS form_schema_id;
