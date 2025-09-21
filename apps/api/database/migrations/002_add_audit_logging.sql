-- Migration: Add audit logging system and user soft delete functionality
-- This migration adds:
-- 1. audit_logs table for tracking user modifications
-- 2. deleted_at column to users table for soft deletion
-- 3. Indexes for performance optimization

-- Add deleted_at column to users table for soft deletion
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Add performance indexes to users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for audit_logs table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Tracks all user modifications for security and debugging purposes';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource being modified (users, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource being modified';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing the changes made';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user making the change';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client user agent string';

COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted (NULL for active users)';

-- Create a function to automatically set deleted_at when is_active is set to false
CREATE OR REPLACE FUNCTION update_deleted_at_on_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_active is being set to false and deleted_at is not already set
  IF NEW.is_active = false AND OLD.is_active = true AND NEW.deleted_at IS NULL THEN
    NEW.deleted_at = CURRENT_TIMESTAMP;
  END IF;

  -- If is_active is being set to true, clear deleted_at
  IF NEW.is_active = true AND OLD.is_active = false THEN
    NEW.deleted_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic deleted_at management
CREATE TRIGGER trigger_update_deleted_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_deleted_at_on_deactivation();