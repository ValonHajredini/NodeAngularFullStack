-- Migration: Fix existing custom themes to have isCustom = true
-- Description: Sets is_custom = true for all themes that have a created_by value
--              Also sets creator_id and theme_definition to satisfy the check constraint
-- Date: 2025-10-18
-- Story: 24.9 - Enhanced Theme Management

-- Update all themes that have a created_by value to set is_custom = true
-- Also copy created_by to creator_id and set theme_definition to empty object
UPDATE form_themes
SET
  is_custom = true,
  creator_id = created_by,
  theme_definition = '{}'::jsonb
WHERE created_by IS NOT NULL
  AND is_custom = false;

-- Verify the update
SELECT
  id,
  name,
  created_by,
  is_custom,
  creator_id,
  theme_definition IS NOT NULL as has_definition
FROM form_themes
WHERE created_by IS NOT NULL
ORDER BY created_at DESC;
