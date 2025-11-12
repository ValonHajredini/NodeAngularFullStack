/**
 * Product Inventory Types
 * Used for inventory tracking with transaction locking support
 */

/**
 * Product inventory record structure.
 * Tracks stock quantity for product variants with SKU-based identification.
 *
 * Note: Uses camelCase per TypeScript conventions.
 * Database columns use snake_case (mapped via SQL aliases in repository layer).
 */
export interface ProductInventory {
  /** Unique identifier (UUID) */
  id: string;

  /** UUID reference to forms(id) - links inventory to specific product form */
  formId: string;

  /** Product/variant SKU (globally unique, max 100 chars) */
  sku: string;

  /** Available stock quantity (must be >= 0) */
  stockQuantity: number;

  /** Reserved stock for pending orders (future feature, must be >= 0) */
  reservedQuantity: number;

  /** Inventory record creation timestamp */
  createdAt: Date;

  /** Last modification timestamp (auto-updated) */
  updatedAt: Date;
}

/**
 * Request interface for creating new inventory records.
 */
export interface CreateProductInventoryRequest {
  /** UUID reference to forms(id) */
  formId: string;

  /** Product/variant SKU */
  sku: string;

  /** Initial stock quantity (default: 0) */
  stockQuantity?: number;

  /** Initial reserved quantity (default: 0) */
  reservedQuantity?: number;
}

/**
 * Request interface for updating inventory stock.
 */
export interface UpdateStockRequest {
  /** SKU to update */
  sku: string;

  /** Quantity to add (positive) or remove (negative) */
  quantity: number;
}

/**
 * Response interface for stock availability check.
 */
export interface StockAvailabilityResponse {
  /** Product/variant SKU */
  sku: string;

  /** Available stock quantity */
  stockQuantity: number;

  /** Whether stock is available (stockQuantity > 0) */
  available: boolean;
}
