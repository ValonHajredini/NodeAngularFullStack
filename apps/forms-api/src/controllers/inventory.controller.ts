import { Request, Response } from 'express';
import { inventoryRepository } from '../repositories/inventory.repository';
import { ApiError } from '../services/forms.service';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * Inventory Controller
 *
 * Handles real-time stock availability checking for product forms.
 * Provides public endpoint for frontend to display stock levels before submission.
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.11: Product Template with Inventory Tracking
 * Task 7: Real-Time Stock API Endpoint
 */
export class InventoryController {
  /**
   * Get stock information for a SKU (simplified endpoint for AC9).
   *
   * @route GET /api/inventory/:sku
   * @param req - Express request with SKU parameter
   * @param res - Express response
   * @returns HTTP response with simplified stock availability (AC9 format)
   * @throws {ApiError} 404 - SKU not found in inventory
   *
   * @example
   * GET /api/inventory/TSHIRT-RED-M
   * Response: {
   *   success: true,
   *   data: {
   *     sku: "TSHIRT-RED-M",
   *     stock_quantity: 42,
   *     available: true
   *   }
   * }
   */
  getStockSimplified = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { sku } = req.params;

      if (!sku) {
        throw new ApiError('SKU is required', 400, 'INVALID_REQUEST');
      }

      // Fetch inventory record
      const inventory = await inventoryRepository.findBySku(sku);

      if (!inventory) {
        throw new ApiError(
          `Product not found: ${sku}`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      // Return simplified stock data as per AC9
      res.status(200).json({
        success: true,
        data: {
          sku: inventory.sku,
          stock_quantity: inventory.stockQuantity,
          available: inventory.stockQuantity > 0,
        },
      });
    }
  );

  /**
   * Get current stock level for a SKU (detailed endpoint).
   *
   * @route GET /api/inventory/stock/:sku
   * @param req - Express request with SKU parameter
   * @param res - Express response
   * @returns HTTP response with stock availability data
   * @throws {ApiError} 404 - SKU not found in inventory
   *
   * @example
   * GET /api/inventory/stock/TSHIRT-RED-M
   * Response: {
   *   success: true,
   *   data: {
   *     sku: "TSHIRT-RED-M",
   *     stock_quantity: 42,
   *     reserved_quantity: 5,
   *     available: 37
   *   }
   * }
   */
  getStock = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sku } = req.params;

    if (!sku) {
      throw new ApiError('SKU is required', 400, 'INVALID_REQUEST');
    }

    // Fetch inventory record
    const inventory = await inventoryRepository.findBySku(sku);

    if (!inventory) {
      throw new ApiError(
        `Product not found: ${sku}`,
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    // Calculate available stock (total - reserved)
    const available = inventory.stockQuantity - inventory.reservedQuantity;

    // Return stock data
    res.status(200).json({
      success: true,
      data: {
        sku: inventory.sku,
        stock_quantity: inventory.stockQuantity,
        reserved_quantity: inventory.reservedQuantity,
        available: Math.max(0, available), // Never return negative
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Check stock availability for a specific quantity.
   *
   * @route GET /api/inventory/check/:sku?quantity=5
   * @param req - Express request with SKU parameter and quantity query
   * @param res - Express response
   * @returns HTTP response indicating if requested quantity is available
   * @throws {ApiError} 400 - Invalid quantity parameter
   * @throws {ApiError} 404 - SKU not found
   *
   * @example
   * GET /api/inventory/check/TSHIRT-RED-M?quantity=5
   * Response: {
   *   success: true,
   *   data: {
   *     sku: "TSHIRT-RED-M",
   *     requested: 5,
   *     available: 37,
   *     in_stock: true
   *   }
   * }
   */
  checkAvailability = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { sku } = req.params;
      const quantity = parseInt(req.query.quantity as string, 10);

      if (!sku) {
        throw new ApiError('SKU is required', 400, 'INVALID_REQUEST');
      }

      if (!quantity || quantity < 1 || isNaN(quantity)) {
        throw new ApiError(
          'Quantity must be a positive integer',
          400,
          'INVALID_QUANTITY'
        );
      }

      // Check availability using repository method
      const isAvailable = await inventoryRepository.checkAvailability(
        sku,
        quantity
      );

      // Get current stock for response
      const inventory = await inventoryRepository.findBySku(sku);

      if (!inventory) {
        throw new ApiError(
          `Product not found: ${sku}`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      const available = inventory.stockQuantity - inventory.reservedQuantity;

      res.status(200).json({
        success: true,
        data: {
          sku: inventory.sku,
          requested: quantity,
          available: Math.max(0, available),
          in_stock: isAvailable,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Get all inventory records for a specific form.
   *
   * @route GET /api/inventory/form/:formId
   * @param req - Express request with formId parameter
   * @param res - Express response
   * @returns HTTP response with all inventory items for the form
   * @throws {ApiError} 400 - Invalid form ID
   *
   * @example
   * GET /api/inventory/form/550e8400-e29b-41d4-a716-446655440000
   * Response: {
   *   success: true,
   *   data: {
   *     form_id: "550e8400-e29b-41d4-a716-446655440000",
   *     items: [
   *       { sku: "TSHIRT-RED-M", stock_quantity: 42, ... },
   *       { sku: "TSHIRT-BLUE-L", stock_quantity: 15, ... }
   *     ]
   *   }
   * }
   */
  getFormInventory = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { formId } = req.params;

      if (!formId) {
        throw new ApiError('Form ID is required', 400, 'INVALID_REQUEST');
      }

      // Fetch all inventory items for the form
      const items = await inventoryRepository.findByFormId(formId);

      res.status(200).json({
        success: true,
        data: {
          form_id: formId,
          items: items.map((item) => ({
            sku: item.sku,
            stock_quantity: item.stockQuantity,
            reserved_quantity: item.reservedQuantity,
            available: Math.max(
              0,
              item.stockQuantity - item.reservedQuantity
            ),
            updated_at: item.updatedAt,
          })),
          count: items.length,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );
}
