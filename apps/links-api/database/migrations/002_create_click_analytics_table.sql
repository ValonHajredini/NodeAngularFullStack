-- Migration: 002_create_click_analytics_table
-- Description: Create click_analytics table for tracking link usage
-- Author: POC Phase 0
-- Date: 2025-10-23

CREATE TABLE IF NOT EXISTS click_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country_code VARCHAR(2),
    city VARCHAR(100),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_device_type CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown'))
);

-- Indexes for analytics queries
CREATE INDEX idx_click_analytics_link_id ON click_analytics(short_link_id);
CREATE INDEX idx_click_analytics_accessed_at ON click_analytics(accessed_at);
CREATE INDEX idx_click_analytics_country ON click_analytics(country_code);
CREATE INDEX idx_click_analytics_device ON click_analytics(device_type);

-- Comments for documentation
COMMENT ON TABLE click_analytics IS 'Tracks detailed analytics for each short link click';
COMMENT ON COLUMN click_analytics.short_link_id IS 'Foreign key to short_links table';
COMMENT ON COLUMN click_analytics.ip_address IS 'IP address of the visitor (IPv4 or IPv6)';
COMMENT ON COLUMN click_analytics.device_type IS 'Type of device: desktop, mobile, tablet, bot, or unknown';
