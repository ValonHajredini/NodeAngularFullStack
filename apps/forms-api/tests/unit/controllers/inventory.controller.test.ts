/**
 * Unit tests for InventoryController
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.11 - Product Template with Inventory Tracking
 * Task: 10.6 - Test stock API endpoint
 */

import { Request, Response, NextFunction } from 'express';
import { InventoryController } from '../../../src/controllers/inventory.controller';
import { InventoryRepository } from '../../../src/repositories/inventory.repository';
import { ProductInventory } from '@nodeangularfullstack/shared';

// Mock dependencies
jest.mock('../../../src/repositories/inventory.repository');

const mockInventoryRepository = new InventoryRepository() as jest.Mocked<InventoryRepository>;

describe('InventoryController', () => {
  let controller: InventoryController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockInventoryRecord: ProductInventory = {
    id: 'inv-123',
    formId: 'form-123',
    sku: 'TSHIRT-RED-M',
    stockQuantity: 50,
    reservedQuantity: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create controller instance
    controller = new InventoryController(mockInventoryRepository);

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next function
    mockNext = jest.fn();
  });

  describe('getStock', () => {
    beforeEach(() => {
      mockRequest = {
        params: {
          sku: 'TSHIRT-RED-M',
        },
      };
    });

    it('should return stock information for valid SKU', async () => {
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(mockInventoryRecord);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith('TSHIRT-RED-M');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sku: 'TSHIRT-RED-M',
          stock_quantity: 50,
          available: true,
        },
      });
    });

    it('should return available: false when stock is zero', async () => {
      const outOfStockInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 0,
      };

      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(outOfStockInventory);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sku: 'TSHIRT-RED-M',
          stock_quantity: 0,
          available: false,
        },
      });
    });

    it('should return available: true when stock is greater than zero', async () => {
      const lowStockInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 1,
      };

      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(lowStockInventory);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sku: 'TSHIRT-RED-M',
          stock_quantity: 1,
          available: true,
        },
      });
    });

    it('should throw 404 error when SKU not found', async () => {
      mockRequest.params = { sku: 'NONEXISTENT-SKU' };
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(null);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Error should be passed to next middleware
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'SKU not found',
        })
      );
    });

    it('should handle different SKU formats', async () => {
      const testCases = [
        'TSHIRT-RED-M',
        'PRODUCT-123',
        'SKU_WITH_UNDERSCORE',
        '1234567890',
      ];

      for (const sku of testCases) {
        jest.clearAllMocks();
        mockRequest.params = { sku };
        mockInventoryRepository.findBySku = jest.fn().mockResolvedValue({
          ...mockInventoryRecord,
          sku,
        });

        await controller.getStock(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith(sku);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({ sku }),
          })
        );
      }
    });

    it('should handle repository errors gracefully', async () => {
      mockInventoryRepository.findBySku = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Database connection failed'),
        })
      );
    });

    it('should return correct response format (AC9 compliance)', async () => {
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(mockInventoryRecord);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Verify exact AC9 format
      expect(responseData).toMatchObject({
        success: true,
        data: {
          sku: expect.any(String),
          stock_quantity: expect.any(Number),
          available: expect.any(Boolean),
        },
      });

      // Verify data types
      expect(typeof responseData.data.sku).toBe('string');
      expect(typeof responseData.data.stock_quantity).toBe('number');
      expect(typeof responseData.data.available).toBe('boolean');
    });
  });

  describe('getStockSimplified', () => {
    beforeEach(() => {
      mockRequest = {
        params: {
          sku: 'TSHIRT-BLUE-M',
        },
      };
    });

    it('should return simplified stock information', async () => {
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue({
        ...mockInventoryRecord,
        sku: 'TSHIRT-BLUE-M',
        stockQuantity: 30,
      });

      await controller.getStockSimplified(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sku: 'TSHIRT-BLUE-M',
          stock_quantity: 30,
          available: true,
        },
      });
    });

    it('should throw 404 for non-existent SKU', async () => {
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(null);

      await controller.getStockSimplified(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'SKU not found',
        })
      );
    });
  });

  describe('performance requirements (AC9)', () => {
    it('should complete request in < 50ms (mocked)', async () => {
      // Mock fast repository response
      mockInventoryRepository.findBySku = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5)); // Simulate 5ms DB query
        return mockInventoryRecord;
      });

      mockRequest.params = { sku: 'TSHIRT-RED-M' };

      const startTime = Date.now();
      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      // In real integration test, this would verify actual DB performance
      // In unit test, we verify the controller doesn't add significant overhead
      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('SQL injection prevention', () => {
    it('should safely handle malicious SKU input', async () => {
      const maliciousSku = "'; DROP TABLE product_inventory; --";
      mockRequest.params = { sku: maliciousSku };

      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(null);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify repository called with raw input (repository handles sanitization)
      expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith(maliciousSku);

      // Should return 404, not cause any SQL injection
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });
  });

  describe('special characters in SKU', () => {
    it('should handle SKUs with special characters', async () => {
      const specialSkus = [
        'PRODUCT-WITH-DASH',
        'PRODUCT_WITH_UNDERSCORE',
        'PRODUCT.WITH.DOT',
        'PRODUCT123',
      ];

      for (const sku of specialSkus) {
        jest.clearAllMocks();
        mockRequest.params = { sku };
        mockInventoryRepository.findBySku = jest.fn().mockResolvedValue({
          ...mockInventoryRecord,
          sku,
        });

        await controller.getStock(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith(sku);
        expect(mockResponse.json).toHaveBeenCalled();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle missing params object', async () => {
      mockRequest.params = undefined as any;

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle undefined SKU param', async () => {
      mockRequest.params = { sku: undefined as any };

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle empty SKU param', async () => {
      mockRequest.params = { sku: '' };
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(null);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith('');
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it('should handle very long SKU strings', async () => {
      const longSku = 'A'.repeat(200);
      mockRequest.params = { sku: longSku };
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(null);

      await controller.getStock(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockInventoryRepository.findBySku).toHaveBeenCalledWith(longSku);
    });
  });
});
