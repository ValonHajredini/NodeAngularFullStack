-- Rollback Migration: DOWN_030_remove_form_templates_table.sql
-- Description: Safely drops form_templates table and all associated indexes
-- Epic: 29 - Form Template System with Business Logic
-- Story: 29.1 - Database Schema and Template Storage Foundation
-- Created: 2025-01-09

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_form_templates_updated_at ON form_templates;

-- Drop indexes in reverse order of creation
DROP INDEX IF EXISTS idx_templates_created_by;
DROP INDEX IF EXISTS idx_templates_usage_count;
DROP INDEX IF EXISTS idx_templates_category;
DROP INDEX IF EXISTS idx_templates_is_active;

-- Drop the form_templates table
-- This will cascade delete any dependent data
DROP TABLE IF EXISTS form_templates;

-- Rollback completed successfully
SELECT 'Form templates table and indexes removed successfully' AS rollback_status;
