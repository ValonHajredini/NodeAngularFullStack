-- Create drawing_projects table for storing user SVG drawing projects
-- Version: 1.0.0
-- Description: Allows users to save their SVG drawings as projects and load them later

CREATE TABLE IF NOT EXISTS drawing_projects (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User ownership (foreign key to users table)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Project metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Drawing template data (stores the complete DrawingTemplate as JSONB)
  template_data JSONB NOT NULL,

  -- Optional thumbnail for preview (base64 encoded PNG)
  thumbnail TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Constraints
  CONSTRAINT drawing_projects_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_projects_user_id ON drawing_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_projects_created_at ON drawing_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drawing_projects_user_active ON drawing_projects(user_id, is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_drawing_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS drawing_projects_updated_at_trigger ON drawing_projects;

CREATE TRIGGER drawing_projects_updated_at_trigger
  BEFORE UPDATE ON drawing_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_drawing_projects_updated_at();

-- Row-Level Security (RLS) for multi-tenancy support
ALTER TABLE drawing_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own projects
DROP POLICY IF EXISTS drawing_projects_select_policy ON drawing_projects;
CREATE POLICY drawing_projects_select_policy ON drawing_projects
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- RLS Policy: Users can only insert their own projects
DROP POLICY IF EXISTS drawing_projects_insert_policy ON drawing_projects;
CREATE POLICY drawing_projects_insert_policy ON drawing_projects
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::UUID);

-- RLS Policy: Users can only update their own projects
DROP POLICY IF EXISTS drawing_projects_update_policy ON drawing_projects;
CREATE POLICY drawing_projects_update_policy ON drawing_projects
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::UUID)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::UUID);

-- RLS Policy: Users can only delete their own projects
DROP POLICY IF EXISTS drawing_projects_delete_policy ON drawing_projects;
CREATE POLICY drawing_projects_delete_policy ON drawing_projects
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Comment on table
COMMENT ON TABLE drawing_projects IS 'Stores SVG drawing projects for users with complete template data';
COMMENT ON COLUMN drawing_projects.template_data IS 'Complete DrawingTemplate JSON structure including shapes, settings, and canvas state';
COMMENT ON COLUMN drawing_projects.thumbnail IS 'Base64 encoded PNG thumbnail for project preview';
