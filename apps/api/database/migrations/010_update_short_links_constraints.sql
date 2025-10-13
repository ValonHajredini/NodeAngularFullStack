-- Migration: Update short_links table constraints for custom names
-- Date: 2025-10-07
-- Description: Updates the code column and constraints to support custom names (3-30 characters)
--              while maintaining backward compatibility with auto-generated codes (6-8 characters)

-- Drop the old length constraint
ALTER TABLE short_links DROP CONSTRAINT IF EXISTS chk_short_links_code_length;

-- Update VARCHAR length to accommodate custom names (max 30 characters)
ALTER TABLE short_links ALTER COLUMN code TYPE VARCHAR(30);

-- Add new length constraint (3-30 characters for custom names, or 6-8 for auto-generated)
ALTER TABLE short_links ADD CONSTRAINT chk_short_links_code_length
    CHECK (length(code) >= 3 AND length(code) <= 30);

-- Update code format constraint to allow hyphens for custom names
ALTER TABLE short_links DROP CONSTRAINT IF EXISTS chk_short_links_code_format;
ALTER TABLE short_links ADD CONSTRAINT chk_short_links_code_format
    CHECK (code ~ '^[a-zA-Z0-9-]+$');

-- Add constraint to prevent consecutive hyphens (only if it doesn't exist)
ALTER TABLE short_links DROP CONSTRAINT IF EXISTS chk_short_links_no_consecutive_hyphens;
ALTER TABLE short_links ADD CONSTRAINT chk_short_links_no_consecutive_hyphens
    CHECK (code !~ '--');

-- Add constraint to prevent leading/trailing hyphens (only if it doesn't exist)
ALTER TABLE short_links DROP CONSTRAINT IF EXISTS chk_short_links_no_edge_hyphens;
ALTER TABLE short_links ADD CONSTRAINT chk_short_links_no_edge_hyphens
    CHECK (code !~ '^-' AND code !~ '-$');

-- Update column comment
COMMENT ON COLUMN short_links.code IS 'Unique short code (3-30 alphanumeric characters with hyphens, auto-generated: 6-8, custom: 3-30)';
