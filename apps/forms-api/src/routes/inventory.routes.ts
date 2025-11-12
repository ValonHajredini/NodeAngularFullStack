import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

/**
 * Inventory Routes
 *
 * Public API endpoints for real-time stock checking.
 * No authentication required - allows public access for form rendering.
 * Rate limiting applied to prevent abuse and DDoS attacks.
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.11: Product Template with Inventory Tracking
 * Task 7: Real-Time Stock API Endpoint
 * QA Fix: Added rate limiting middleware (QA Gate 29.11 - Immediate Recommendation)
 */

const router = Router();
const inventoryController = new InventoryController();

/**
 * @route GET /api/inventory/stock/:sku
 * @desc Get detailed stock level for a SKU (with reserved_quantity)
 * @access Public
 * @middleware Rate Limiting (100 req/min per IP)
 */
router.get(
  '/stock/:sku',
  RateLimitMiddleware.inventoryStockLimit(),
  inventoryController.getStock
);

/**
 * @route GET /api/inventory/check/:sku
 * @desc Check stock availability for requested quantity
 * @query quantity - Number of units to check (required)
 * @access Public
 * @middleware Rate Limiting (100 req/min per IP)
 */
router.get(
  '/check/:sku',
  RateLimitMiddleware.inventoryStockLimit(),
  inventoryController.checkAvailability
);

/**
 * @route GET /api/inventory/form/:formId
 * @desc Get all inventory items for a specific form
 * @access Public
 * @middleware Rate Limiting (100 req/min per IP)
 */
router.get(
  '/form/:formId',
  RateLimitMiddleware.inventoryStockLimit(),
  inventoryController.getFormInventory
);

/**
 * @route GET /api/inventory/:sku
 * @desc Get simplified stock information (AC9 - exact format for frontend)
 * @access Public
 * @middleware Rate Limiting (100 req/min per IP)
 * NOTE: This route must be LAST to avoid conflicts with specific routes above
 */
router.get(
  '/:sku',
  RateLimitMiddleware.inventoryStockLimit(),
  inventoryController.getStockSimplified
);

export default router;
