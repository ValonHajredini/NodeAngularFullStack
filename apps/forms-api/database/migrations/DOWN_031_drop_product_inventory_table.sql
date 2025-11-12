-- Rollback Migration: DOWN_031_drop_product_inventory_table.sql
-- Description: Removes product_inventory table and related objects
-- Epic: 29 - Form Template System with Business Logic
-- Story: 29.11 - Product Template with Inventory Tracking
-- Created: 2025-01-09

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_product_inventory_updated_at ON product_inventory;

-- Drop indexes
DROP INDEX IF EXISTS idx_product_inventory_sku;
DROP INDEX IF EXISTS idx_product_inventory_form_id;

-- Drop table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS product_inventory CASCADE;

-- Rollback completed successfully
SELECT 'Product inventory table dropped successfully' AS rollback_status;
