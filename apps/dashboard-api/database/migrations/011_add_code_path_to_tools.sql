-- Migration: 011_add_code_path_to_tools.sql
-- Description: Adds code_path field to tools table for tracking source code location
-- Created: 2025-09-28

-- Add code_path column to tools table
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS code_path VARCHAR(500);

-- Create index for code path lookups (helpful for searching by path)
CREATE INDEX IF NOT EXISTS idx_tools_code_path ON tools(code_path);

-- Add comments for documentation
COMMENT ON COLUMN tools.code_path IS 'Path to the tool''s source code location (e.g. "src/app/features/tools/components/short-link/")';

-- Backfill existing tools with their known code paths
UPDATE tools
SET code_path = CASE
    WHEN key = 'short-link' THEN 'src/app/features/tools/components/short-link/'
    WHEN key = 'my-todo-app' THEN 'src/app/features/tools/components/todo/'
    WHEN key = 'calc' THEN 'src/app/features/tools/components/calculator/'
    WHEN key = 'calendar' THEN 'src/app/features/tools/components/calendar/'
    WHEN key = 'map' THEN 'src/app/features/tools/components/map/'
    ELSE NULL
END
WHERE code_path IS NULL;

-- Verify the migration by showing updated tools
SELECT
    id,
    key,
    name,
    code_path,
    'Migration 011 completed successfully' as migration_status
FROM tools
ORDER BY created_at;