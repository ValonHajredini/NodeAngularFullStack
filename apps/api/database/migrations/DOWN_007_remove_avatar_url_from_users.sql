-- Rollback Migration: DOWN_007_remove_avatar_url_from_users.sql
-- Description: Removes avatar_url field from users table
-- Created: 2025-09-26

-- Remove index first
DROP INDEX IF EXISTS idx_users_avatar_url;

-- Remove avatar_url column from users table
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;

-- Rollback completed successfully
SELECT 'Avatar URL field removed from users table successfully' AS rollback_status;