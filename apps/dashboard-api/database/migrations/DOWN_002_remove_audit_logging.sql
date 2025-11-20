-- Reverse Migration: DOWN_002_remove_audit_logging.sql
-- Description: Remove audit logging system and related tables
-- This reverses migration 002_add_audit_logging.sql
-- Created: 2025-09-21

-- Drop triggers first
DROP TRIGGER IF EXISTS audit_users_changes ON users;
DROP TRIGGER IF EXISTS audit_tenants_changes ON tenants;

-- Drop trigger functions
DROP FUNCTION IF EXISTS audit_changes();

-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_tenant_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_resource;

-- Drop the audit_logs table
DROP TABLE IF EXISTS audit_logs;

-- Migration completed successfully
SELECT 'Audit logging system removed successfully' AS migration_status;