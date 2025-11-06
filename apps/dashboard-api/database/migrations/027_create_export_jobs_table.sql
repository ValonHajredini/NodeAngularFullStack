/**
 * Migration: Create export_jobs table
 * Purpose: Track export job lifecycle, progress tracking, and audit trail
 * Author: Development Team
 * Date: 2025-10-26
 * Dependencies: 026_create_tool_registry_table.sql
 * Epic: 33.1 Export Core Infrastructure
 * Story: 33.1.2 Export Jobs Database Schema
 */

-- ============================================================================
-- ENUM TYPE: export_job_status
-- ============================================================================

/**
 * Export job status lifecycle states.
 * Represents all possible states an export job can be in.
 */
DO $$ BEGIN
  CREATE TYPE export_job_status AS ENUM (
    'pending',       -- Job created, not yet started
    'in_progress',   -- Job actively executing steps
    'completed',     -- Job finished successfully
    'failed',        -- Job failed with error
    'cancelled',     -- Job cancelled by user
    'cancelling',    -- Job cancellation in progress
    'rolled_back'    -- Job rolled back after failure
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, skip creation
    NULL;
END $$;

-- ============================================================================
-- TABLE: export_jobs
-- ============================================================================

/**
 * Export Jobs Table
 * Tracks the complete lifecycle of tool export operations including:
 * - Job status and progress tracking
 * - Step-by-step execution monitoring
 * - Error handling and rollback state
 * - Generated package metadata
 * - Complete audit trail
 */
CREATE TABLE IF NOT EXISTS export_jobs (
  -- ========================================================================
  -- Primary Key
  -- ========================================================================
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ========================================================================
  -- Foreign Keys
  -- ========================================================================
  -- Tool being exported (CASCADE: delete jobs when tool deleted)
  tool_id UUID NOT NULL REFERENCES tool_registry(id) ON DELETE CASCADE,

  -- User who initiated export (SET NULL: preserve jobs when user deleted)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- ========================================================================
  -- Job Status
  -- ========================================================================
  status export_job_status NOT NULL DEFAULT 'pending',

  -- ========================================================================
  -- Progress Tracking
  -- ========================================================================
  steps_completed INTEGER NOT NULL DEFAULT 0,
  steps_total INTEGER NOT NULL DEFAULT 0,
  current_step VARCHAR(255),
  progress_percentage INTEGER NOT NULL DEFAULT 0,

  -- ========================================================================
  -- Export Package Information
  -- ========================================================================
  package_path VARCHAR(500),
  package_size_bytes BIGINT,

  -- ========================================================================
  -- Error Information
  -- ========================================================================
  error_message TEXT,

  -- ========================================================================
  -- Audit Trail
  -- ========================================================================
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- ========================================================================
  -- Constraints
  -- ========================================================================

  -- Status must be a valid ENUM value
  CONSTRAINT check_status_valid CHECK (
    status IN (
      'pending', 'in_progress', 'completed', 'failed',
      'cancelled', 'cancelling', 'rolled_back'
    )
  ),

  -- Steps completed cannot exceed total steps
  CONSTRAINT check_steps_valid CHECK (steps_completed <= steps_total),

  -- Progress percentage must be between 0 and 100
  CONSTRAINT check_progress_valid CHECK (progress_percentage BETWEEN 0 AND 100),

  -- Package size must be non-negative if provided
  CONSTRAINT check_package_size_valid CHECK (
    package_size_bytes IS NULL OR package_size_bytes >= 0
  )
);

-- ============================================================================
-- INDEXES: Query Performance Optimization
-- ============================================================================

/**
 * Index: tool_id
 * Purpose: Query all export jobs for a specific tool
 * Use Case: Tool export history, tool deletion cascade
 * Expected Performance: < 50ms with 10K rows
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_tool_id
  ON export_jobs(tool_id);

/**
 * Index: user_id
 * Purpose: Query user's export history
 * Use Case: User dashboard, export history page
 * Expected Performance: < 50ms with 10K rows
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id
  ON export_jobs(user_id);

/**
 * Index: status
 * Purpose: Filter jobs by status (pending, in_progress, etc.)
 * Use Case: Job queue processing, monitoring dashboards
 * Expected Performance: < 100ms with 10K rows
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_status
  ON export_jobs(status);

/**
 * Index: created_at
 * Purpose: Cleanup queries to delete old jobs
 * Use Case: Automated cleanup cron job
 * Expected Performance: < 500ms with 10K rows
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at
  ON export_jobs(created_at);

/**
 * Composite Index: (user_id, created_at DESC)
 * Purpose: User export history with sorting
 * Use Case: User dashboard showing recent exports
 * Benefit: Enables index-only scan (no table lookup needed)
 * Expected Performance: < 50ms with 10K rows
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_created
  ON export_jobs(user_id, created_at DESC);

-- ============================================================================
-- COMMENTS: Table and Column Documentation
-- ============================================================================

COMMENT ON TABLE export_jobs IS 'Tracks export job lifecycle and progress for tool exports';

COMMENT ON COLUMN export_jobs.job_id IS 'Unique export job identifier (UUID)';

COMMENT ON COLUMN export_jobs.tool_id IS 'Tool being exported - CASCADE delete when tool deleted';

COMMENT ON COLUMN export_jobs.user_id IS 'User who initiated export - SET NULL when user deleted';

COMMENT ON COLUMN export_jobs.status IS 'Current job status (pending → in_progress → completed/failed)';

COMMENT ON COLUMN export_jobs.steps_completed IS 'Number of export steps completed';

COMMENT ON COLUMN export_jobs.steps_total IS 'Total number of export steps';

COMMENT ON COLUMN export_jobs.current_step IS 'Description of current export step';

COMMENT ON COLUMN export_jobs.progress_percentage IS 'Calculated progress percentage (0-100)';

COMMENT ON COLUMN export_jobs.package_path IS 'Filesystem path to generated export package (.tar.gz)';

COMMENT ON COLUMN export_jobs.package_size_bytes IS 'Size of export package in bytes';

COMMENT ON COLUMN export_jobs.error_message IS 'Error details if job failed';

COMMENT ON COLUMN export_jobs.created_at IS 'Job creation timestamp';

COMMENT ON COLUMN export_jobs.updated_at IS 'Last update timestamp';

COMMENT ON COLUMN export_jobs.started_at IS 'Job execution start timestamp';

COMMENT ON COLUMN export_jobs.completed_at IS 'Job completion timestamp';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 027: export_jobs table created successfully';
  RAISE NOTICE 'Status: ENUM type export_job_status created';
  RAISE NOTICE 'Status: Table export_jobs created with all constraints';
  RAISE NOTICE 'Status: 5 indexes created for query optimization';
  RAISE NOTICE 'Status: Table and column comments added';
END $$;
