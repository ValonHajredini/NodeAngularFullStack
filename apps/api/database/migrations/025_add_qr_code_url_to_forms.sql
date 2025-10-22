-- Migration 025: Add QR code URL to forms table
-- Story 26.3: Integrated QR Code Generation and Display

-- Add QR code URL column to forms table for storing generated QR code storage URLs
ALTER TABLE forms ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(500);

-- Add index for efficient QR code URL lookups
CREATE INDEX IF NOT EXISTS idx_forms_qr_code_url ON forms(qr_code_url) WHERE qr_code_url IS NOT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN forms.qr_code_url IS 'Storage URL for the form QR code image in DigitalOcean Spaces (form-qr-codes folder)';