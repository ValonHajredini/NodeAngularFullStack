-- Rollback Migration: DOWN_017_remove_form_themes_table.sql
-- Description: Removes form_themes table and all associated objects
-- Created: 2025-01-15

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_form_themes_updated_at ON form_themes;

-- Drop all indexes
DROP INDEX IF EXISTS idx_form_themes_usage;
DROP INDEX IF EXISTS idx_form_themes_active;
DROP INDEX IF EXISTS idx_form_themes_created_by;

-- Drop the table
DROP TABLE IF EXISTS form_themes;

-- Rollback completed successfully
SELECT 'Form themes table removed successfully' AS rollback_status;
