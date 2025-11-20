-- Migration: 026_create_tool_registry_table.sql
-- Description: Creates tool_registry table for storing tool metadata and discovery
-- Epic: 30 - Tool Registration and Export System
-- Story: 30.1.1 - Tool Registry Database Schema
-- Created: 2025-10-23

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

/**
 * Tool Registry Table
 *
 * Stores metadata for all tools in the system to enable:
 * - Tool discovery and listing
 * - Tool lifecycle management (beta, active, deprecated)
 * - Microservice export tracking
 * - Frontend route and API endpoint mapping
 *
 * The manifest_json JSONB column provides flexibility for tool-specific
 * metadata without requiring schema changes.
 */
CREATE TABLE IF NOT EXISTS tool_registry (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Tool identification
    tool_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    icon VARCHAR(50),

    -- Routing and API configuration
    route VARCHAR(255) NOT NULL,
    api_base VARCHAR(255) NOT NULL,

    -- Access control
    permissions TEXT[],

    -- Lifecycle management
    status VARCHAR(20) DEFAULT 'beta',

    -- Export tracking (for Epic 33 - Tool Export)
    is_exported BOOLEAN DEFAULT false,
    exported_at TIMESTAMP WITH TIME ZONE,
    service_url VARCHAR(255),
    database_name VARCHAR(100),

    -- Tool manifest (stores complete tool configuration as JSONB)
    manifest_json JSONB,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    -- Foreign key constraints
    CONSTRAINT fk_tool_registry_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- Status constraint
    CONSTRAINT check_tool_registry_status CHECK (status IN ('beta', 'active', 'deprecated'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tool_registry_tool_id ON tool_registry(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_registry_status ON tool_registry(status);
CREATE INDEX IF NOT EXISTS idx_tool_registry_is_exported ON tool_registry(is_exported);
CREATE INDEX IF NOT EXISTS idx_tool_registry_created_at ON tool_registry(created_at DESC);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_tool_registry_updated_at ON tool_registry;
CREATE TRIGGER trigger_tool_registry_updated_at
    BEFORE UPDATE ON tool_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table and column comments for documentation
COMMENT ON TABLE tool_registry IS 'Tool metadata registry for tool discovery and lifecycle management';
COMMENT ON COLUMN tool_registry.id IS 'Primary key (UUID)';
COMMENT ON COLUMN tool_registry.tool_id IS 'Unique tool identifier (e.g., "form-builder", "drawing-tool")';
COMMENT ON COLUMN tool_registry.name IS 'Human-readable tool name';
COMMENT ON COLUMN tool_registry.description IS 'Tool description for discovery';
COMMENT ON COLUMN tool_registry.version IS 'Semantic version (e.g., "1.0.0")';
COMMENT ON COLUMN tool_registry.icon IS 'Icon identifier or emoji for UI display';
COMMENT ON COLUMN tool_registry.route IS 'Frontend route path (e.g., "/tools/forms")';
COMMENT ON COLUMN tool_registry.api_base IS 'API base path (e.g., "/api/forms")';
COMMENT ON COLUMN tool_registry.permissions IS 'Array of required permissions (e.g., ["admin", "user"])';
COMMENT ON COLUMN tool_registry.status IS 'Tool lifecycle status: beta, active, or deprecated';
COMMENT ON COLUMN tool_registry.is_exported IS 'Whether tool has been exported as microservice';
COMMENT ON COLUMN tool_registry.exported_at IS 'Timestamp when tool was exported';
COMMENT ON COLUMN tool_registry.service_url IS 'Microservice URL after export';
COMMENT ON COLUMN tool_registry.database_name IS 'Dedicated database name after export';
COMMENT ON COLUMN tool_registry.manifest_json IS 'Complete tool manifest as JSONB (routes, endpoints, dependencies)';
COMMENT ON COLUMN tool_registry.created_at IS 'Tool registration timestamp';
COMMENT ON COLUMN tool_registry.updated_at IS 'Last modification timestamp (auto-updated)';
COMMENT ON COLUMN tool_registry.created_by IS 'User who registered the tool (NULL if user deleted)';
