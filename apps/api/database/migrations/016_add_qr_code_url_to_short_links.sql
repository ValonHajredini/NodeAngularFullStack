-- Migration: Add qr_code_url column to short_links table
-- Purpose: Store DigitalOcean Spaces URL for persisted QR code images
-- Related Story: 7.5.short-link-qr-code-storage.story.md

-- Add qr_code_url column to short_links table
ALTER TABLE short_links
ADD COLUMN qr_code_url VARCHAR(512);

-- Add index for potential future queries
CREATE INDEX idx_short_links_qr_code_url ON short_links(qr_code_url);

-- Add comment for documentation
COMMENT ON COLUMN short_links.qr_code_url IS 'DigitalOcean Spaces public URL for the QR code PNG image';
