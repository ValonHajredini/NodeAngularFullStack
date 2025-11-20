-- Reverse Migration: DOWN_004_remove_tenant_rls_policies.sql
-- Description: Remove Row-Level Security (RLS) policies and functions for multi-tenancy
-- This reverses migration 004_add_tenant_rls_policies.sql
-- Created: 2025-09-21

-- Drop tenant-aware view
DROP VIEW IF EXISTS tenant_users;

-- Revoke permissions on functions before dropping them
REVOKE EXECUTE ON FUNCTION get_current_tenant_id() FROM application_role;
REVOKE EXECUTE ON FUNCTION set_tenant_context(UUID) FROM application_role;
REVOKE EXECUTE ON FUNCTION clear_tenant_context() FROM application_role;
REVOKE EXECUTE ON FUNCTION user_belongs_to_tenant(UUID, UUID) FROM application_role;
REVOKE EXECUTE ON FUNCTION validate_tenant_api_access(UUID, UUID, TEXT) FROM application_role;
REVOKE EXECUTE ON FUNCTION log_tenant_access(UUID, UUID, TEXT, TEXT, UUID, INET, TEXT) FROM application_role;
REVOKE EXECUTE ON FUNCTION check_tenant_feature_access(UUID, TEXT) FROM application_role;
REVOKE EXECUTE ON FUNCTION check_tenant_limit(UUID, TEXT, INTEGER) FROM application_role;

-- Drop all database functions
DROP FUNCTION IF EXISTS check_tenant_limit(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS check_tenant_feature_access(UUID, TEXT);
DROP FUNCTION IF EXISTS log_tenant_access(UUID, UUID, TEXT, TEXT, UUID, INET, TEXT);
DROP FUNCTION IF EXISTS validate_tenant_api_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS user_belongs_to_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS clear_tenant_context();
DROP FUNCTION IF EXISTS set_tenant_context(UUID);
DROP FUNCTION IF EXISTS get_current_tenant_id();

-- Drop RLS policies
DROP POLICY IF EXISTS tenant_isolation_password_resets ON password_resets;
DROP POLICY IF EXISTS tenant_isolation_sessions ON sessions;
DROP POLICY IF EXISTS admin_access_users ON users;
DROP POLICY IF EXISTS tenant_isolation_users ON users;

-- Disable Row-Level Security on tables
ALTER TABLE password_resets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Revoke permissions from application_role
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM application_role;
REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM application_role;

-- Drop application_role if it exists
DROP ROLE IF EXISTS application_role;

-- Migration completed successfully
SELECT 'Row-Level Security policies removed successfully' AS migration_status;