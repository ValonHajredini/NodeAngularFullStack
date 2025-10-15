-- Migration: 018_add_theme_id_to_form_schemas.sql
-- Description: Adds theme_id column to form_schemas table with foreign key constraint
-- Created: 2025-01-15

-- Add theme_id column to form_schemas table
ALTER TABLE form_schemas 
ADD COLUMN IF NOT EXISTS theme_id UUID;

-- Add foreign key constraint to form_themes table
ALTER TABLE form_schemas 
ADD CONSTRAINT fk_form_schemas_theme_id 
FOREIGN KEY (theme_id) 
REFERENCES form_themes(id) 
ON DELETE SET NULL;

-- Create index on theme_id for efficient querying
CREATE INDEX IF NOT EXISTS idx_form_schemas_theme ON form_schemas(theme_id) WHERE theme_id IS NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN form_schemas.theme_id IS 'Optional theme ID reference for form styling';

-- Migration completed successfully
SELECT 'Theme ID column added to form_schemas table successfully' AS migration_status;
