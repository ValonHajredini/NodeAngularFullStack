-- Reverse Migration: DOWN_003_remove_enhanced_multi_tenancy.sql
-- Description: Remove enhanced multi-tenancy features and revert to basic structure
-- This reverses migration 003_enhance_multi_tenancy.sql
-- Created: 2025-09-21

-- Remove triggers first
DROP TRIGGER IF EXISTS update_tenant_updated_at ON tenants;
DROP TRIGGER IF EXISTS update_user_updated_at ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove indexes
DROP INDEX IF EXISTS idx_tenants_slug;
DROP INDEX IF EXISTS idx_tenants_plan;
DROP INDEX IF EXISTS idx_tenants_status;
DROP INDEX IF EXISTS idx_tenants_is_active;
DROP INDEX IF EXISTS idx_tenants_settings_features;
DROP INDEX IF EXISTS idx_users_tenant_email;
DROP INDEX IF EXISTS idx_users_tenant_id;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_last_login;

-- Revert tenants table to basic structure
ALTER TABLE tenants
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS settings;

-- Revert columns to original types/constraints
ALTER TABLE tenants
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN max_users SET DEFAULT 5;

-- Remove enhanced constraint
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS chk_tenants_plan;

-- Add back original constraint if it existed
ALTER TABLE tenants ADD CONSTRAINT chk_tenants_plan
  CHECK (plan IN ('free', 'starter', 'professional', 'enterprise'));

-- Revert users table changes
-- Remove the enhanced unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email_tenant;

-- Add back simpler unique constraint
ALTER TABLE users ADD CONSTRAINT uq_users_email_tenant
  UNIQUE (email, tenant_id);

-- Migration completed successfully
SELECT 'Enhanced multi-tenancy features removed successfully' AS migration_status;