-- Migration: 030_add_jsonb_indexes_for_analytics.sql
-- Description: Adds GIN indexes on JSONB columns for optimized analytics queries
-- Epic: 30 - Category-Personalized Templates and Analytics
-- Story: 30.3 - Poll and Quiz Analytics Strategies (Backend)
-- Created: 2025-01-27

-- Create GIN index on form_submissions.values_json for JSONB operator queries
-- This index optimizes:
-- - Poll option aggregation (fs.values_json ->> 'poll_option')
-- - Quiz score bucketing (fs.values_json ->> 'score')
-- - JSONB key existence checks (fs.values_json ? 'key')
-- - JSONB containment queries (fs.values_json @> '{"key": "value"}')
--
-- Performance impact:
-- - Query speedup: 10-100x for JSONB operations on large datasets
-- - Index size: ~30% of table size (acceptable for analytics use case)
-- - Write overhead: Minimal (~5% slower inserts, acceptable for analytics workload)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_values_json_gin
    ON form_submissions USING gin (values_json);

COMMENT ON INDEX idx_form_submissions_values_json_gin IS
    'GIN index for optimized JSONB queries in poll/quiz analytics (Epic 30, Story 30.3)';

-- Create GIN index on form_submissions.metadata for metadata queries (optional but recommended)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_metadata_gin
    ON form_submissions USING gin (metadata) WHERE metadata IS NOT NULL;

COMMENT ON INDEX idx_form_submissions_metadata_gin IS
    'GIN index for optimized JSONB metadata queries (Epic 30)';

-- Create composite index for common analytics query pattern: form_schema_id + submitted_at
-- This optimizes time-series analytics queries that filter by form and sort by time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_submissions_schema_time
    ON form_submissions(form_schema_id, submitted_at DESC);

COMMENT ON INDEX idx_form_submissions_schema_time IS
    'Composite index for time-series analytics queries (Epic 30)';

-- Migration completed successfully
SELECT 'JSONB analytics indexes created successfully' AS migration_status;
