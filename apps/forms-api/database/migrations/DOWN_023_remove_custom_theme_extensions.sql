-- Rollback Migration: DOWN_023_remove_custom_theme_extensions.sql
-- Description: Removes custom theme extensions from form_themes table, restoring Epic 20-21 state
-- Created: 2025-01-16

-- Remove check constraints
ALTER TABLE form_themes DROP CONSTRAINT IF EXISTS check_custom_theme_requirements;
ALTER TABLE form_themes DROP CONSTRAINT IF EXISTS check_theme_definition_size;

-- Remove indexes
DROP INDEX IF EXISTS idx_form_themes_is_custom;
DROP INDEX IF EXISTS idx_form_themes_creator_id;

-- Remove foreign key constraint
ALTER TABLE form_themes DROP CONSTRAINT IF EXISTS fk_form_themes_creator_id;

-- Remove added columns
ALTER TABLE form_themes DROP COLUMN IF EXISTS theme_definition;
ALTER TABLE form_themes DROP COLUMN IF EXISTS creator_id;
ALTER TABLE form_themes DROP COLUMN IF EXISTS is_custom;

-- Migration rollback completed successfully
SELECT 'Custom theme extensions removed from form_themes table' AS rollback_status;