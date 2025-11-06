-- Rollback Migration: Remove qr_code_url column from short_links table
-- Purpose: Revert QR code storage enhancement if needed
-- Related Story: 7.5.short-link-qr-code-storage.story.md

-- Drop index
DROP INDEX IF EXISTS idx_short_links_qr_code_url;

-- Remove qr_code_url column from short_links table
ALTER TABLE short_links
DROP COLUMN IF EXISTS qr_code_url;
