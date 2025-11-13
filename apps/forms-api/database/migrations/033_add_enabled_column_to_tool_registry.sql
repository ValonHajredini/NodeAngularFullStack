-- Migration: 033_add_enabled_column_to_tool_registry.sql
-- Description: Adds 'enabled' column to tool_registry for simpler enable/disable toggling
-- Context: Tests expect 'enabled' column but original schema used 'status' enum
-- Created: 2025-11-13

/**
 * Add enabled column to tool_registry
 *
 * This provides a simple boolean toggle alongside the richer 'status' field.
 * - enabled: Simple on/off toggle (for UI and permissions)
 * - status: Lifecycle management (beta/active/deprecated)
 *
 * A tool can be 'active' but disabled (e.g., during maintenance)
 */
ALTER TABLE tool_registry
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Create index for enabled filtering
CREATE INDEX IF NOT EXISTS idx_tool_registry_enabled ON tool_registry(enabled);

-- Add column comment
COMMENT ON COLUMN tool_registry.enabled IS 'Whether tool is enabled/accessible (independent of lifecycle status)';

-- Set existing tools to enabled=true
UPDATE tool_registry SET enabled = true WHERE enabled IS NULL;
