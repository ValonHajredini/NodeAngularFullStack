-- Migration: 013_ensure_tool_configs_for_all_tools.sql
-- Description: Ensures all tools have at least one default configuration and adds automatic config creation
-- Created: 2025-10-01

-- Create default configurations for any tools that don't have configs yet
INSERT INTO tool_configs (tool_id, version, display_mode, layout_settings, is_active)
SELECT
    t.id as tool_id,
    '1.0.0' as version,
    'standard' as display_mode,
    '{"maxWidth": "1200px", "padding": "2rem"}'::jsonb as layout_settings,
    true as is_active
FROM tools t
LEFT JOIN tool_configs tc ON t.id = tc.tool_id
WHERE tc.id IS NULL
ON CONFLICT DO NOTHING;

-- Create function to automatically create default config for new tools
CREATE OR REPLACE FUNCTION auto_create_tool_config()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default configuration for the newly created tool
    INSERT INTO tool_configs (tool_id, version, display_mode, layout_settings, is_active)
    VALUES (
        NEW.id,
        '1.0.0',
        'standard',
        '{"maxWidth": "1200px", "padding": "2rem"}'::jsonb,
        true
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_create_tool_config ON tools;
CREATE TRIGGER trigger_auto_create_tool_config
    AFTER INSERT ON tools
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_tool_config();

-- Add comments for documentation
COMMENT ON FUNCTION auto_create_tool_config() IS 'Automatically creates a default configuration for newly created tools';

-- Verify that all tools now have at least one configuration
DO $$
DECLARE
    tools_without_configs INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO tools_without_configs
    FROM tools t
    LEFT JOIN tool_configs tc ON t.id = tc.tool_id
    WHERE tc.id IS NULL;

    IF tools_without_configs > 0 THEN
        RAISE NOTICE 'Warning: % tool(s) still without configurations', tools_without_configs;
    ELSE
        RAISE NOTICE 'Success: All tools now have configurations';
    END IF;
END $$;

-- Migration completed successfully
SELECT 'Tool configs ensured for all tools and automatic creation enabled' AS migration_status;
