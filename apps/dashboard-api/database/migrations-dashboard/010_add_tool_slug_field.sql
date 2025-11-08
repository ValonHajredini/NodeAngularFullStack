-- Migration: 010_add_tool_slug_field.sql
-- Description: Adds slug field to tools table for SEO-friendly URLs
-- Created: 2025-09-27

-- Add slug column to tools table
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create function to generate URL-friendly slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special characters
    RETURN regexp_replace(
        regexp_replace(
            lower(trim(input_text)),
            '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure unique slug
CREATE OR REPLACE FUNCTION ensure_unique_slug(base_slug TEXT, tool_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    candidate_slug TEXT;
    counter INTEGER := 0;
    slug_exists BOOLEAN;
BEGIN
    candidate_slug := base_slug;

    LOOP
        -- Check if slug exists (excluding current tool if updating)
        SELECT EXISTS(
            SELECT 1 FROM tools
            WHERE slug = candidate_slug
            AND (tool_id IS NULL OR id != tool_id)
        ) INTO slug_exists;

        IF NOT slug_exists THEN
            RETURN candidate_slug;
        END IF;

        counter := counter + 1;
        candidate_slug := base_slug || '-' || counter;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION update_tool_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug from name if not provided or if name changed
    IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.name != NEW.name) THEN
        NEW.slug := ensure_unique_slug(generate_slug(NEW.name), NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic slug generation
DROP TRIGGER IF EXISTS trigger_tool_slug_generation ON tools;
CREATE TRIGGER trigger_tool_slug_generation
    BEFORE INSERT OR UPDATE ON tools
    FOR EACH ROW
    EXECUTE FUNCTION update_tool_slug();

-- Backfill slugs for existing tools
UPDATE tools
SET slug = ensure_unique_slug(generate_slug(name), id)
WHERE slug IS NULL;

-- Make slug column NOT NULL after backfill
ALTER TABLE tools
ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint on slug column
CREATE UNIQUE INDEX IF NOT EXISTS idx_tools_slug_unique ON tools(slug);

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);

-- Add comments for documentation
COMMENT ON COLUMN tools.slug IS 'URL-friendly slug generated from tool name (e.g. "short-link-generator")';
COMMENT ON FUNCTION generate_slug(TEXT) IS 'Converts text to URL-friendly slug format';
COMMENT ON FUNCTION ensure_unique_slug(TEXT, UUID) IS 'Ensures slug uniqueness by appending counter if needed';

-- Verify the migration
SELECT
    id,
    key,
    name,
    slug,
    'Migration 010 completed successfully' as migration_status
FROM tools
ORDER BY created_at;