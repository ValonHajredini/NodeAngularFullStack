-- Rollback Migration: DOWN_030_remove_jsonb_indexes_for_analytics.sql
-- Description: Removes GIN indexes added for analytics optimization
-- Epic: 30 - Category-Personalized Templates and Analytics
-- Story: 30.3 - Poll and Quiz Analytics Strategies (Backend)
-- Created: 2025-01-27

-- Drop composite index for form_schema_id + submitted_at
DROP INDEX CONCURRENTLY IF EXISTS idx_form_submissions_schema_time;

-- Drop GIN index on form_submissions.metadata
DROP INDEX CONCURRENTLY IF EXISTS idx_form_submissions_metadata_gin;

-- Drop GIN index on form_submissions.values_json
DROP INDEX CONCURRENTLY IF EXISTS idx_form_submissions_values_json_gin;

-- Migration rollback completed successfully
SELECT 'JSONB analytics indexes removed successfully' AS rollback_status;
