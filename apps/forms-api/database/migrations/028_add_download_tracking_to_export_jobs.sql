/**
 * Migration: Add download tracking columns to export_jobs table
 * Purpose: Track download metrics, package expiration, and retention policies
 * Author: Development Team
 * Date: 2025-10-26
 * Dependencies: 027_create_export_jobs_table.sql
 * Epic: 33.2 Export Package Distribution
 * Story: 33.2.1 Export Package Download
 */

-- ============================================================================
-- ALTER TABLE: export_jobs
-- Add download tracking and package retention columns
-- ============================================================================

/**
 * Add download_count column
 * Tracks the number of times a package has been downloaded.
 * Defaults to 0 for new jobs, incremented atomically on each download.
 */
ALTER TABLE export_jobs
ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;

/**
 * Add last_downloaded_at column
 * Timestamp of the most recent download.
 * NULL if package has never been downloaded.
 */
ALTER TABLE export_jobs
ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP WITH TIME ZONE;

/**
 * Add package_expires_at column
 * Timestamp when the export package will be automatically deleted.
 * Calculated as: completed_at + package_retention_days
 * NULL if job not completed or expiration not set.
 */
ALTER TABLE export_jobs
ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMP WITH TIME ZONE;

/**
 * Add package_retention_days column
 * Number of days to retain the package file after job completion.
 * Defaults to 30 days. Can be overridden per-job.
 * Used to calculate package_expires_at timestamp.
 */
ALTER TABLE export_jobs
ADD COLUMN IF NOT EXISTS package_retention_days INTEGER NOT NULL DEFAULT 30;

-- ============================================================================
-- CONSTRAINTS: Data Validation
-- ============================================================================

/**
 * Check: download_count must be non-negative
 * Prevents invalid negative download counts from database errors.
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_download_count_valid'
  ) THEN
    ALTER TABLE export_jobs
    ADD CONSTRAINT check_download_count_valid
    CHECK (download_count >= 0);
  END IF;
END $$;

/**
 * Check: package_retention_days must be positive
 * Ensures retention period is at least 1 day.
 * Typical values: 7, 30, 90, 365 days
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_package_retention_valid'
  ) THEN
    ALTER TABLE export_jobs
    ADD CONSTRAINT check_package_retention_valid
    CHECK (package_retention_days > 0);
  END IF;
END $$;

-- ============================================================================
-- INDEXES: Query Performance Optimization
-- ============================================================================

/**
 * Index: package_expires_at
 * Purpose: Cleanup queries to find expired packages for deletion
 * Use Case: Daily cron job to delete old packages (Story 33.2.1 Task 9)
 * Expected Performance: < 100ms with 10K rows
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_package_expires_at
  ON export_jobs(package_expires_at)
  WHERE package_expires_at IS NOT NULL;

/**
 * Partial Index: Completed jobs with packages ready for download
 * Purpose: Optimize download endpoint queries
 * Use Case: Filter jobs by status='completed' with non-null package_path
 * Benefit: Smaller index size (only completed jobs), faster lookups
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_completed_packages
  ON export_jobs(job_id, package_path, package_expires_at)
  WHERE status = 'completed' AND package_path IS NOT NULL;

-- ============================================================================
-- COMMENTS: Column Documentation
-- ============================================================================

COMMENT ON COLUMN export_jobs.download_count IS
  'Number of times package has been downloaded - incremented atomically';

COMMENT ON COLUMN export_jobs.last_downloaded_at IS
  'Timestamp of most recent download (NULL if never downloaded)';

COMMENT ON COLUMN export_jobs.package_expires_at IS
  'Package expiration timestamp - calculated as completed_at + retention_days';

COMMENT ON COLUMN export_jobs.package_retention_days IS
  'Number of days to retain package after completion (default: 30 days)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 028: Download tracking columns added successfully';
  RAISE NOTICE 'Status: Added download_count column (default: 0)';
  RAISE NOTICE 'Status: Added last_downloaded_at column (nullable)';
  RAISE NOTICE 'Status: Added package_expires_at column (nullable)';
  RAISE NOTICE 'Status: Added package_retention_days column (default: 30)';
  RAISE NOTICE 'Status: Added 2 validation constraints';
  RAISE NOTICE 'Status: Created 2 indexes for query optimization';
  RAISE NOTICE 'Status: Added column comments for documentation';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (FOR MANUAL TESTING)
-- ============================================================================

-- After running this migration, verify the columns were added:
--
-- Check if new columns exist
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'export_jobs'
--   AND column_name IN (
--     'download_count', 'last_downloaded_at',
--     'package_expires_at', 'package_retention_days'
--   );
--
-- Check if indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'export_jobs'
--   AND indexname LIKE '%download%'
--    OR indexname LIKE '%expires%'
--    OR indexname LIKE '%packages%';
--
-- Test constraint validation (should fail)
-- INSERT INTO export_jobs (job_id, tool_id, user_id, download_count)
-- VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), -1);
-- Expected: ERROR - violates check constraint "check_download_count_valid"
