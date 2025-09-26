-- Migration: 007_add_avatar_url_to_users.sql
-- Description: Adds avatar_url field to users table for avatar storage URLs
-- Created: 2025-09-26

-- Add avatar_url column to users table
ALTER TABLE users
ADD COLUMN avatar_url VARCHAR(500) NULL;

-- Add index for performance on avatar_url lookups (partial index for non-null values only)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image stored in cloud storage (DigitalOcean Spaces)';

-- Migration completed successfully
SELECT 'Avatar URL field added to users table successfully' AS migration_status;