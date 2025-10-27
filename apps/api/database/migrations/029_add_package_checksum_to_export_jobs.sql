/**
 * Migration: Add package checksum and verification columns to export_jobs table
 * Purpose: Enable package integrity verification and tamper detection
 * Author: Development Team
 * Date: 2025-10-26
 * Dependencies: 028_add_download_tracking_to_export_jobs.sql
 * Epic: 33.2 Export Package Distribution
 * Story: 33.2.2 Package Verification & Security
 */

-- ============================================================================
-- ALTER TABLE: export_jobs
-- Add checksum and verification tracking columns
-- ============================================================================

/**
 * Add package_checksum column
 * Stores SHA-256 checksum of the export package file.
 * Format: 64 lowercase hexadecimal characters
 * Generated immediately after .tar.gz creation for integrity verification.
 * NULL if package not yet created or checksum generation failed.
 */
ALTER TABLE export_jobs
ADD COLUMN package_checksum VARCHAR(64);

/**
 * Add package_algorithm column
 * Specifies the hashing algorithm used for checksum generation.
 * Defaults to 'sha256' for consistency and security.
 * Allows future migration to stronger algorithms (sha512, sha3-256, etc.).
 */
ALTER TABLE export_jobs
ADD COLUMN package_algorithm VARCHAR(20) NOT NULL DEFAULT 'sha256';

/**
 * Add checksum_verified_at column
 * Timestamp when package integrity was last verified against stored checksum.
 * Updated on each download when integrity check passes.
 * NULL if never verified or verification failed.
 * Used to track security audit trail.
 */
ALTER TABLE export_jobs
ADD COLUMN checksum_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- CONSTRAINTS: Data Validation
-- ============================================================================

/**
 * Check: package_checksum format validation
 * Ensures checksum is exactly 64 lowercase hexadecimal characters (SHA-256).
 * Prevents invalid checksums from being stored in database.
 * Format: ^[0-9a-f]{64}$ (regex pattern)
 */
ALTER TABLE export_jobs
ADD CONSTRAINT check_package_checksum_format
CHECK (
  package_checksum IS NULL
  OR (
    package_checksum ~ '^[0-9a-f]{64}$'
    AND LENGTH(package_checksum) = 64
  )
);

/**
 * Check: package_algorithm must be a known algorithm
 * Validates algorithm is one of the supported hashing algorithms.
 * Current supported: sha256
 * Future support: sha512, sha3-256, sha3-512
 */
ALTER TABLE export_jobs
ADD CONSTRAINT check_package_algorithm_valid
CHECK (package_algorithm IN ('sha256', 'sha512', 'sha3-256', 'sha3-512'));

/**
 * Check: checksum_verified_at must be after package creation
 * Ensures verification timestamp is logically consistent.
 * Verification cannot occur before package completion.
 */
ALTER TABLE export_jobs
ADD CONSTRAINT check_checksum_verified_after_completion
CHECK (
  checksum_verified_at IS NULL
  OR completed_at IS NULL
  OR checksum_verified_at >= completed_at
);

-- ============================================================================
-- INDEXES: Query Performance Optimization
-- ============================================================================

/**
 * Index: package_checksum
 * Purpose: Fast lookups for checksum verification and duplicate detection
 * Use Case: Checksum verification endpoint, tamper detection queries
 * Expected Performance: < 50ms with 100K rows
 * Partial index: Only index non-null checksums (completed jobs)
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_package_checksum
  ON export_jobs(package_checksum)
  WHERE package_checksum IS NOT NULL;

/**
 * Index: checksum verification tracking
 * Purpose: Security audit queries - find unverified or tampered packages
 * Use Case: Admin dashboard, security monitoring, compliance reports
 * Columns: (status, checksum_verified_at, package_checksum)
 * Filters: Completed jobs with packages
 */
CREATE INDEX IF NOT EXISTS idx_export_jobs_checksum_verification
  ON export_jobs(status, checksum_verified_at, package_checksum)
  WHERE status = 'completed' AND package_checksum IS NOT NULL;

-- ============================================================================
-- COMMENTS: Column Documentation
-- ============================================================================

COMMENT ON COLUMN export_jobs.package_checksum IS
  'SHA-256 checksum of export package (64 lowercase hex characters) - generated after package creation';

COMMENT ON COLUMN export_jobs.package_algorithm IS
  'Hashing algorithm used for checksum generation (default: sha256)';

COMMENT ON COLUMN export_jobs.checksum_verified_at IS
  'Timestamp of last successful integrity verification (updated on download)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 029: Package checksum columns added successfully';
  RAISE NOTICE 'Status: Added package_checksum column (VARCHAR 64, nullable)';
  RAISE NOTICE 'Status: Added package_algorithm column (default: sha256)';
  RAISE NOTICE 'Status: Added checksum_verified_at column (nullable)';
  RAISE NOTICE 'Status: Added 3 validation constraints';
  RAISE NOTICE 'Status: Created 2 indexes for query optimization';
  RAISE NOTICE 'Status: Added column comments for documentation';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (FOR MANUAL TESTING)
-- ============================================================================

/**
 * After running this migration, verify the columns were added:
 *
 * -- Check if new columns exist
 * SELECT column_name, data_type, column_default, is_nullable
 * FROM information_schema.columns
 * WHERE table_name = 'export_jobs'
 *   AND column_name IN (
 *     'package_checksum', 'package_algorithm', 'checksum_verified_at'
 *   );
 *
 * -- Check if indexes were created
 * SELECT indexname, indexdef
 * FROM pg_indexes
 * WHERE tablename = 'export_jobs'
 *   AND (indexname LIKE '%checksum%' OR indexname LIKE '%verification%');
 *
 * -- Check constraints
 * SELECT conname, pg_get_constraintdef(oid)
 * FROM pg_constraint
 * WHERE conname LIKE '%checksum%' OR conname LIKE '%algorithm%';
 *
 * -- Test checksum format validation (should fail)
 * UPDATE export_jobs
 * SET package_checksum = 'INVALID_CHECKSUM'
 * WHERE job_id = (SELECT job_id FROM export_jobs LIMIT 1);
 * -- Expected: ERROR - violates check constraint "check_package_checksum_format"
 *
 * -- Test valid checksum (should succeed)
 * UPDATE export_jobs
 * SET package_checksum = 'a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'
 * WHERE job_id = (SELECT job_id FROM export_jobs LIMIT 1);
 */
