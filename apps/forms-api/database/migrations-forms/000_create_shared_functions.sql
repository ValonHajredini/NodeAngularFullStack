-- Migration: 000_create_shared_functions.sql
-- Description: Creates shared database functions required by FORMS migrations
-- Created: 2025-01-07

-- Create function for automatically updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update updated_at column on row updates';

SELECT 'Shared functions created successfully' AS migration_status;
