/**
 * Rollback Migration: Drop export_jobs table
 * Purpose: Rollback migration 027_create_export_jobs_table.sql
 * Author: Development Team
 * Date: 2025-10-26
 * Reverts: 027_create_export_jobs_table.sql
 * Epic: 33.1 Export Core Infrastructure
 * Story: 33.1.2 Export Jobs Database Schema
 *
 * CAUTION: This migration will delete all export job records and history.
 * Ensure backups are taken before running this rollback in production.
 */

-- ============================================================================
-- ROLLBACK PROCEDURE
-- ============================================================================

-- Log rollback start
DO $$
BEGIN
  RAISE NOTICE 'Starting rollback of migration 027...';
  RAISE NOTICE 'This will drop the export_jobs table and all its data';
END $$;

-- ============================================================================
-- DROP TABLE: export_jobs
-- ============================================================================

/**
 * Drop the export_jobs table.
 * CASCADE option ensures any dependent objects are also dropped.
 * IF EXISTS prevents errors if table was already dropped.
 */
DROP TABLE IF EXISTS export_jobs CASCADE;

-- Log table drop
DO $$
BEGIN
  RAISE NOTICE 'Status: export_jobs table dropped (with CASCADE)';
END $$;

-- ============================================================================
-- DROP ENUM TYPE: export_job_status
-- ============================================================================

/**
 * Drop the export_job_status ENUM type.
 * This must be done AFTER dropping the table to avoid dependency errors.
 * IF EXISTS prevents errors if type was already dropped.
 */
DROP TYPE IF EXISTS export_job_status CASCADE;

-- Log type drop
DO $$
BEGIN
  RAISE NOTICE 'Status: export_job_status ENUM type dropped';
END $$;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback of migration 027 completed successfully';
  RAISE NOTICE 'All export job data has been removed';
  RAISE NOTICE 'To restore, run migration 027_create_export_jobs_table.sql';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (FOR MANUAL TESTING)
-- ============================================================================

/**
 * After running this rollback, verify the table and type are dropped:
 *
 * -- Check if table exists (should return 0 rows)
 * SELECT tablename FROM pg_tables
 * WHERE schemaname = 'public' AND tablename = 'export_jobs';
 *
 * -- Check if type exists (should return 0 rows)
 * SELECT typname FROM pg_type
 * WHERE typname = 'export_job_status';
 */
