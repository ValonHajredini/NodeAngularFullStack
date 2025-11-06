-- Rollback Migration: DOWN_026_remove_tool_registry_table.sql
-- Description: Removes tool_registry table and all associated indexes and triggers
-- Epic: 30 - Tool Registration and Export System
-- Story: 30.1.1 - Tool Registry Database Schema
-- Created: 2025-10-23

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_tool_registry_updated_at ON tool_registry;

-- Drop indexes
DROP INDEX IF EXISTS idx_tool_registry_created_at;
DROP INDEX IF EXISTS idx_tool_registry_is_exported;
DROP INDEX IF EXISTS idx_tool_registry_status;
DROP INDEX IF EXISTS idx_tool_registry_tool_id;

-- Drop table (CASCADE will remove foreign key references if any exist)
DROP TABLE IF EXISTS tool_registry CASCADE;
