-- Migration: 020_add_unique_constraint_to_form_themes_name.sql
-- Description: Adds unique constraint to form_themes.name column for conflict handling
-- Created: 2025-01-15

-- Add unique constraint to form_themes.name column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unique_form_themes_name'
        AND table_name = 'form_themes'
    ) THEN
        ALTER TABLE form_themes ADD CONSTRAINT unique_form_themes_name UNIQUE (name);
    END IF;
END $$;

-- Add comment for the constraint
COMMENT ON CONSTRAINT unique_form_themes_name ON form_themes IS 'Ensures theme names are unique for conflict handling in seed scripts';

-- Migration completed successfully
SELECT 'Unique constraint added to form_themes.name' AS migration_status;
