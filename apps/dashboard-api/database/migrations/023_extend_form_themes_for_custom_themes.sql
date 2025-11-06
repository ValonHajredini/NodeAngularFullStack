-- Migration: 023_extend_form_themes_for_custom_themes.sql
-- Description: Extends form_themes table to support custom theme storage while maintaining Epic 20-21 compatibility
-- Created: 2025-01-16

-- Add is_custom column (boolean) to distinguish custom vs predefined themes
ALTER TABLE form_themes 
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

-- Add creator_id column (uuid) to track custom theme creators
ALTER TABLE form_themes 
ADD COLUMN IF NOT EXISTS creator_id UUID;

-- Add theme_definition column (jsonb) for custom theme storage
ALTER TABLE form_themes 
ADD COLUMN IF NOT EXISTS theme_definition JSONB;

-- Add foreign key constraint for creator_id to users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_form_themes_creator_id'
        AND table_name = 'form_themes'
    ) THEN
        ALTER TABLE form_themes 
        ADD CONSTRAINT fk_form_themes_creator_id 
        FOREIGN KEY (creator_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for efficient custom theme queries
CREATE INDEX IF NOT EXISTS idx_form_themes_is_custom ON form_themes(is_custom) WHERE is_custom = true;
CREATE INDEX IF NOT EXISTS idx_form_themes_creator_id ON form_themes(creator_id) WHERE creator_id IS NOT NULL;

-- Add check constraint to ensure custom themes have creator_id and theme_definition
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_custom_theme_requirements'
        AND table_name = 'form_themes'
    ) THEN
        ALTER TABLE form_themes
        ADD CONSTRAINT check_custom_theme_requirements
        CHECK (
            (is_custom = false) OR
            (is_custom = true AND creator_id IS NOT NULL AND theme_definition IS NOT NULL)
        );
    END IF;
END $$;

-- Add check constraint for theme_definition size limit (50KB)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_theme_definition_size'
        AND table_name = 'form_themes'
    ) THEN
        ALTER TABLE form_themes
        ADD CONSTRAINT check_theme_definition_size
        CHECK (
            theme_definition IS NULL OR
            pg_column_size(theme_definition) <= 51200  -- 50KB in bytes
        );
    END IF;
END $$;

-- Update existing themes to mark them as predefined (not custom)
UPDATE form_themes 
SET is_custom = false 
WHERE is_custom IS NULL;

-- Add comments for new columns
COMMENT ON COLUMN form_themes.is_custom IS 'Distinguishes custom themes (true) from predefined themes (false)';
COMMENT ON COLUMN form_themes.creator_id IS 'UUID reference to users(id) for custom theme creators, null for predefined themes';
COMMENT ON COLUMN form_themes.theme_definition IS 'JSONB storage for custom theme definitions (max 50KB), null for predefined themes';

-- Migration completed successfully
SELECT 'Form themes table extended for custom theme support' AS migration_status;