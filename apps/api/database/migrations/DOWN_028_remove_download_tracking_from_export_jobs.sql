/**
 * Rollback Migration: Remove download tracking columns from export_jobs table
 * Purpose: Rollback migration 028_add_download_tracking_to_export_jobs.sql
 * Author: Development Team
 * Date: 2025-10-26
 * Reverts: 028_add_download_tracking_to_export_jobs.sql
 * Epic: 33.2 Export Package Distribution
 * Story: 33.2.1 Export Package Download
 *
 * CAUTION: This migration will delete all download tracking data.
 * Ensure backups are taken before running this rollback in production.
 */

-- ============================================================================
-- ROLLBACK PROCEDURE
-- ============================================================================

-- Log rollback start
DO $$
BEGIN
  RAISE NOTICE 'Starting rollback of migration 028...';
  RAISE NOTICE 'This will remove download tracking columns from export_jobs table';
END $$;

-- ============================================================================
-- DROP INDEXES: Remove query performance indexes
-- ============================================================================

/**
 * Drop package_expires_at index
 */
DROP INDEX IF EXISTS idx_export_jobs_package_expires_at;

-- Log index drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped idx_export_jobs_package_expires_at index';
END $$;

/**
 * Drop completed packages partial index
 */
DROP INDEX IF EXISTS idx_export_jobs_completed_packages;

-- Log index drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped idx_export_jobs_completed_packages index';
END $$;

-- ============================================================================
-- DROP CONSTRAINTS: Remove data validation constraints
-- ============================================================================

/**
 * Drop download_count validation constraint
 */
ALTER TABLE export_jobs
DROP CONSTRAINT IF EXISTS check_download_count_valid;

-- Log constraint drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped check_download_count_valid constraint';
END $$;

/**
 * Drop package_retention_days validation constraint
 */
ALTER TABLE export_jobs
DROP CONSTRAINT IF EXISTS check_package_retention_valid;

-- Log constraint drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped check_package_retention_valid constraint';
END $$;

-- ============================================================================
-- DROP COLUMNS: Remove download tracking columns
-- ============================================================================

/**
 * Drop download_count column
 * WARNING: All download count data will be lost
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS download_count;

-- Log column drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped download_count column';
END $$;

/**
 * Drop last_downloaded_at column
 * WARNING: All download timestamp data will be lost
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS last_downloaded_at;

-- Log column drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped last_downloaded_at column';
END $$;

/**
 * Drop package_expires_at column
 * WARNING: Package expiration data will be lost
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS package_expires_at;

-- Log column drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped package_expires_at column';
END $$;

/**
 * Drop package_retention_days column
 * WARNING: Retention policy data will be lost
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS package_retention_days;

-- Log column drop
DO $$
BEGIN
  RAISE NOTICE 'Status: Dropped package_retention_days column';
END $$;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback of migration 028 completed successfully';
  RAISE NOTICE 'All download tracking data has been removed';
  RAISE NOTICE 'To restore, run migration 028_add_download_tracking_to_export_jobs.sql';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (FOR MANUAL TESTING)
-- ============================================================================

/**
 * After running this rollback, verify the columns were removed:
 *
 * -- Check if columns no longer exist (should return 0 rows)
 * SELECT column_name FROM information_schema.columns
 * WHERE table_name = 'export_jobs'
 *   AND column_name IN (
 *     'download_count', 'last_downloaded_at',
 *     'package_expires_at', 'package_retention_days'
 *   );
 *
 * -- Check if indexes were dropped (should return 0 rows)
 * SELECT indexname FROM pg_indexes
 * WHERE tablename = 'export_jobs'
 *   AND (
 *     indexname = 'idx_export_jobs_package_expires_at'
 *     OR indexname = 'idx_export_jobs_completed_packages'
 *   );
 */
