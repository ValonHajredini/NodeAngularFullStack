/**
 * Rollback Migration: Remove package checksum columns from export_jobs table
 * Purpose: Reverse migration 029 - Remove checksum and verification tracking
 * Author: Development Team
 * Date: 2025-10-26
 * Rollback For: 029_add_package_checksum_to_export_jobs.sql
 * Epic: 33.2 Export Package Distribution
 * Story: 33.2.2 Package Verification & Security
 */

-- ============================================================================
-- DROP INDEXES (Before dropping columns)
-- ============================================================================

/**
 * Drop index: package_checksum lookup index
 * Must drop before dropping the column it indexes
 */
DROP INDEX IF EXISTS idx_export_jobs_package_checksum;

/**
 * Drop index: checksum verification tracking index
 * Must drop before dropping the columns it indexes
 */
DROP INDEX IF EXISTS idx_export_jobs_checksum_verification;

-- ============================================================================
-- DROP CONSTRAINTS (Before dropping columns)
-- ============================================================================

/**
 * Drop constraint: checksum format validation
 * Must drop before dropping package_checksum column
 */
ALTER TABLE export_jobs
DROP CONSTRAINT IF EXISTS check_package_checksum_format;

/**
 * Drop constraint: algorithm validation
 * Must drop before dropping package_algorithm column
 */
ALTER TABLE export_jobs
DROP CONSTRAINT IF EXISTS check_package_algorithm_valid;

/**
 * Drop constraint: verification timestamp validation
 * Must drop before dropping checksum_verified_at column
 */
ALTER TABLE export_jobs
DROP CONSTRAINT IF EXISTS check_checksum_verified_after_completion;

-- ============================================================================
-- DROP COLUMNS
-- ============================================================================

/**
 * Drop checksum_verified_at column
 * Removes verification timestamp tracking
 * WARNING: This will delete all verification audit trail data
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS checksum_verified_at;

/**
 * Drop package_algorithm column
 * Removes hashing algorithm specification
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS package_algorithm;

/**
 * Drop package_checksum column
 * Removes SHA-256 checksum storage
 * WARNING: This will delete all package integrity checksums
 * After rollback, package integrity verification will not be possible
 */
ALTER TABLE export_jobs
DROP COLUMN IF EXISTS package_checksum;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Rollback 029: Package checksum columns removed successfully';
  RAISE NOTICE 'Status: Dropped 2 indexes';
  RAISE NOTICE 'Status: Dropped 3 constraints';
  RAISE NOTICE 'Status: Dropped package_checksum column';
  RAISE NOTICE 'Status: Dropped package_algorithm column';
  RAISE NOTICE 'Status: Dropped checksum_verified_at column';
  RAISE WARNING 'Data Loss: All package checksums and verification history deleted';
  RAISE WARNING 'Impact: Package integrity verification no longer available';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (FOR MANUAL TESTING)
-- ============================================================================

/**
 * After running this rollback, verify the columns were removed:
 *
 * -- Check if columns were dropped
 * SELECT column_name
 * FROM information_schema.columns
 * WHERE table_name = 'export_jobs'
 *   AND column_name IN (
 *     'package_checksum', 'package_algorithm', 'checksum_verified_at'
 *   );
 * -- Expected: 0 rows (columns should not exist)
 *
 * -- Check if indexes were dropped
 * SELECT indexname
 * FROM pg_indexes
 * WHERE tablename = 'export_jobs'
 *   AND (indexname LIKE '%checksum%' OR indexname LIKE '%verification%');
 * -- Expected: 0 rows (indexes should not exist)
 *
 * -- Check if constraints were dropped
 * SELECT conname
 * FROM pg_constraint
 * WHERE conname LIKE '%checksum%' OR conname LIKE '%algorithm%';
 * -- Expected: 0 rows (constraints should not exist)
 */
