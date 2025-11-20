-- Migration: DOWN_015_remove_forms_tables.sql
-- Description: Rollback migration 015 - removes forms, form_schemas, and form_submissions tables
-- Created: 2025-01-04

-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_schemas CASCADE;
DROP TABLE IF EXISTS forms CASCADE;

-- Drop indexes (CASCADE on table drop handles these, but explicit for clarity)
DROP INDEX IF EXISTS idx_form_submissions_submitted_at;
DROP INDEX IF EXISTS idx_form_submissions_user_id;
DROP INDEX IF EXISTS idx_form_submissions_form_schema_id;
DROP INDEX IF EXISTS idx_form_schemas_is_published;
DROP INDEX IF EXISTS idx_form_schemas_expires_at;
DROP INDEX IF EXISTS idx_form_schemas_render_token;
DROP INDEX IF EXISTS idx_form_schemas_form_id;
DROP INDEX IF EXISTS idx_forms_status;
DROP INDEX IF EXISTS idx_forms_tenant_id;
DROP INDEX IF EXISTS idx_forms_user_id;

-- Migration rollback completed successfully
SELECT 'Forms tables removed successfully' AS migration_rollback_status;
