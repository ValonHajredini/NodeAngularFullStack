-- Rollback Migration: DOWN_018_remove_theme_id_from_form_schemas.sql
-- Description: Removes theme_id column from form_schemas table
-- Created: 2025-01-15

-- Drop the index first
DROP INDEX IF EXISTS idx_form_schemas_theme;

-- Drop the foreign key constraint
ALTER TABLE form_schemas 
DROP CONSTRAINT IF EXISTS fk_form_schemas_theme_id;

-- Drop the theme_id column
ALTER TABLE form_schemas 
DROP COLUMN IF EXISTS theme_id;

-- Rollback completed successfully
SELECT 'Theme ID column removed from form_schemas table successfully' AS rollback_status;
