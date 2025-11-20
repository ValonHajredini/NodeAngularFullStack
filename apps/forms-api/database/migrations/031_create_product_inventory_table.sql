-- Migration: 031_create_product_inventory_table.sql
-- Description: Creates product_inventory table for inventory tracking with race condition prevention
-- Epic: 29 - Form Template System with Business Logic
-- Story: 29.11 - Product Template with Inventory Tracking
-- Created: 2025-01-09

-- Create product_inventory table for stock management
-- Note: gen_random_uuid() is built-in to PostgreSQL 13+ (no extension required)
CREATE TABLE IF NOT EXISTS product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_product_inventory_form_id FOREIGN KEY (form_id)
        REFERENCES forms(id) ON DELETE CASCADE,

    -- CHECK constraints to prevent negative stock
    CONSTRAINT check_product_inventory_stock_quantity CHECK (
        stock_quantity >= 0
    ),
    CONSTRAINT check_product_inventory_reserved_quantity CHECK (
        reserved_quantity >= 0
    ),
    CONSTRAINT check_product_inventory_sku_length CHECK (
        LENGTH(sku) >= 1 AND LENGTH(sku) <= 100
    )
);

-- Create B-tree index for SKU lookups (critical for performance)
-- This index is essential for SELECT FOR UPDATE queries in transaction locking
CREATE INDEX IF NOT EXISTS idx_product_inventory_sku
    ON product_inventory (sku);

-- Create B-tree index for form_id foreign key lookups
CREATE INDEX IF NOT EXISTS idx_product_inventory_form_id
    ON product_inventory (form_id);

-- Create trigger for automatic updated_at updates on product_inventory
DROP TRIGGER IF EXISTS trigger_product_inventory_updated_at ON product_inventory;
CREATE TRIGGER trigger_product_inventory_updated_at
    BEFORE UPDATE ON product_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for product_inventory table
COMMENT ON TABLE product_inventory IS 'Product inventory tracking with SKU-based stock management and transaction locking support';
COMMENT ON COLUMN product_inventory.id IS 'Primary key (UUID)';
COMMENT ON COLUMN product_inventory.form_id IS 'UUID reference to forms(id) - links inventory to specific product form';
COMMENT ON COLUMN product_inventory.sku IS 'Product/variant SKU (globally unique, max 100 chars)';
COMMENT ON COLUMN product_inventory.stock_quantity IS 'Available stock quantity (must be >= 0)';
COMMENT ON COLUMN product_inventory.reserved_quantity IS 'Reserved stock for pending orders (future feature, must be >= 0)';
COMMENT ON COLUMN product_inventory.created_at IS 'Inventory record creation timestamp';
COMMENT ON COLUMN product_inventory.updated_at IS 'Last modification timestamp (auto-updated)';

-- Migration completed successfully
SELECT 'Product inventory table created successfully' AS migration_status;
