/**
 * Unit tests for InventoryExecutor
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.11 - Product Template with Inventory Tracking
 * Task: 10.3-10.5 - Test executor validation and execution logic
 */

import { InventoryExecutor } from '../../../../src/services/template-executors/inventory-executor';
import { InventoryRepository } from '../../../../src/repositories/inventory.repository';
import {
  FormSubmission,
  FormTemplate,
  InventoryConfig,
  FormFieldType,
  ProductInventory,
} from '@nodeangularfullstack/shared';
import { Pool, PoolClient } from 'pg';

// Mock dependencies
jest.mock('../../../../src/repositories/inventory.repository');

describe('InventoryExecutor', () => {
  let executor: InventoryExecutor;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let mockInventoryRepository: jest.Mocked<InventoryRepository>;

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Product Order Form',
    description: 'E-commerce product template',
    category: 'ecommerce',
    templateSchema: {
      fields: [
        {
          id: 'product_images',
          type: FormFieldType.IMAGE_GALLERY,
          label: 'Select Product',
          fieldName: 'product_images',
          required: true,
          order: 1,
        },
        {
          id: 'quantity',
          type: FormFieldType.NUMBER,
          label: 'Quantity',
          fieldName: 'quantity',
          required: true,
          order: 2,
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: { showSuccessMessage: true },
      },
    },
    businessLogicConfig: {
      type: 'inventory',
      variantField: 'product_images',
      quantityField: 'quantity',
      stockTable: 'product_inventory',
    },
    previewImageUrl: null,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInventoryConfig: InventoryConfig = {
    type: 'inventory',
    variantField: 'product_images',
    quantityField: 'quantity',
    stockTable: 'product_inventory',
  };

  const mockInventoryRecord: ProductInventory = {
    id: 'inv-123',
    formId: 'form-123',
    sku: 'TSHIRT-RED-M',
    stockQuantity: 50,
    reservedQuantity: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Create mock database pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    } as any;

    // Create mock repository
    mockInventoryRepository = new InventoryRepository() as jest.Mocked<InventoryRepository>;

    // Create executor instance
    executor = new InventoryExecutor(mockPool, mockInventoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should pass validation with valid submission and sufficient stock', async () => {
      const submission: Partial<FormSubmission> = {
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: 5,
        },
      };

      mockInventoryRepository.checkAvailability = jest.fn().mockResolvedValue(true);
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(mockInventoryRecord);

      const result = await executor.validate(submission, mockTemplate, mockInventoryConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockInventoryRepository.checkAvailability).toHaveBeenCalledWith('TSHIRT-RED-M', 5);
    });

    it('should fail validation when variant field not found in schema', async () => {
      const invalidConfig: InventoryConfig = {
        type: 'inventory',
        variantField: 'nonexistent_field',
        quantityField: 'quantity',
        stockTable: 'product_inventory',
      };

      const submission: Partial<FormSubmission> = {
        data: {
          quantity: 5,
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Variant field "nonexistent_field" not found in schema');
    });

    it('should fail validation when quantity field not found in schema', async () => {
      const invalidConfig: InventoryConfig = {
        type: 'inventory',
        variantField: 'product_images',
        quantityField: 'nonexistent_quantity',
        stockTable: 'product_inventory',
      };

      const submission: Partial<FormSubmission> = {
        data: {
          product_images: 'TSHIRT-RED-M',
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quantity field "nonexistent_quantity" not found in schema');
    });

    it('should fail validation when no SKU selected', async () => {
      const submission: Partial<FormSubmission> = {
        data: {
          quantity: 5,
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockInventoryConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No SKU selected (variant selection required)');
    });

    it('should fail validation when quantity is invalid (< 1)', async () => {
      const submission: Partial<FormSubmission> = {
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: 0,
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockInventoryConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid quantity');
    });

    it('should fail validation when insufficient stock available', async () => {
      const submission: Partial<FormSubmission> = {
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: 100,
        },
      };

      mockInventoryRepository.checkAvailability = jest.fn().mockResolvedValue(false);
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(mockInventoryRecord);

      const result = await executor.validate(submission, mockTemplate, mockInventoryConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Insufficient stock. Only 50 units available.');
    });

    it('should fail validation when SKU not found in inventory', async () => {
      const submission: Partial<FormSubmission> = {
        data: {
          product_images: 'NONEXISTENT-SKU',
          quantity: 1,
        },
      };

      mockInventoryRepository.checkAvailability = jest.fn().mockResolvedValue(false);
      mockInventoryRepository.findBySku = jest.fn().mockResolvedValue(null);

      const result = await executor.validate(submission, mockTemplate, mockInventoryConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Insufficient stock. Only 0 units available.');
    });

    it('should accumulate multiple validation errors', async () => {
      const invalidConfig: InventoryConfig = {
        type: 'inventory',
        variantField: 'invalid_variant',
        quantityField: 'invalid_quantity',
        stockTable: 'product_inventory',
      };

      const submission: Partial<FormSubmission> = {
        data: {},
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Variant field "invalid_variant" not found in schema');
      expect(result.errors).toContain('Quantity field "invalid_quantity" not found in schema');
    });
  });

  describe('execute', () => {
    const mockSubmission: FormSubmission = {
      id: 'submission-123',
      formId: 'form-123',
      data: {
        product_images: 'TSHIRT-RED-M',
        quantity: 5,
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully execute inventory decrement with transaction', async () => {
      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 45, // 50 - 5
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      const result = await executor.execute(mockSubmission, mockTemplate, mockInventoryConfig);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sku: 'TSHIRT-RED-M',
        remaining_stock: 45,
      });
      expect(result.message).toBe('Inventory updated successfully');

      // Verify transaction flow
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-RED-M',
        5
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on inventory update failure', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] } as any); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockRejectedValue(new Error('Insufficient stock'));

      await expect(
        executor.execute(mockSubmission, mockTemplate, mockInventoryConfig)
      ).rejects.toThrow('Inventory update failed: Insufficient stock');

      // Verify rollback
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on SKU not found error', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] } as any); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockRejectedValue(new Error('SKU not found: INVALID-SKU'));

      await expect(
        executor.execute(mockSubmission, mockTemplate, mockInventoryConfig)
      ).rejects.toThrow('Inventory update failed: SKU not found: INVALID-SKU');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even when transaction fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Database connection lost'));

      await expect(
        executor.execute(mockSubmission, mockTemplate, mockInventoryConfig)
      ).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should extract SKU from complex variant metadata structure', async () => {
      const submissionWithVariantObject: FormSubmission = {
        ...mockSubmission,
        data: {
          product_images: { sku: 'TSHIRT-BLUE-L', color: 'Blue', size: 'L' },
          quantity: 2,
        },
      };

      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        sku: 'TSHIRT-BLUE-L',
        stockQuantity: 48,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      const result = await executor.execute(
        submissionWithVariantObject,
        mockTemplate,
        mockInventoryConfig
      );

      expect(result.success).toBe(true);
      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-BLUE-L',
        2
      );
    });

    it('should handle quantity as string and convert to number', async () => {
      const submissionWithStringQuantity: FormSubmission = {
        ...mockSubmission,
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: '10', // String instead of number
        },
      };

      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 40,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      const result = await executor.execute(
        submissionWithStringQuantity,
        mockTemplate,
        mockInventoryConfig
      );

      expect(result.success).toBe(true);
      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-RED-M',
        10 // Converted to number
      );
    });
  });

  describe('extractSku (private method behavior)', () => {
    it('should extract SKU from string value', async () => {
      const submission: FormSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 49,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      await executor.execute(submission, mockTemplate, mockInventoryConfig);

      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-RED-M',
        1
      );
    });

    it('should extract SKU from object with sku property', async () => {
      const submission: FormSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        data: {
          product_images: { sku: 'TSHIRT-BLUE-M', color: 'Blue' },
          quantity: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        sku: 'TSHIRT-BLUE-M',
        stockQuantity: 29,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      await executor.execute(submission, mockTemplate, mockInventoryConfig);

      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-BLUE-M',
        1
      );
    });
  });

  describe('extractQuantity (private method behavior)', () => {
    it('should extract numeric quantity', async () => {
      const submission: FormSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: 15,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 35,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      await executor.execute(submission, mockTemplate, mockInventoryConfig);

      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-RED-M',
        15
      );
    });

    it('should parse string quantity to number', async () => {
      const submission: FormSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        data: {
          product_images: 'TSHIRT-RED-M',
          quantity: '7',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedInventory: ProductInventory = {
        ...mockInventoryRecord,
        stockQuantity: 43,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValue(updatedInventory);

      await executor.execute(submission, mockTemplate, mockInventoryConfig);

      expect(mockInventoryRepository.lockAndDecrement).toHaveBeenCalledWith(
        mockClient,
        'TSHIRT-RED-M',
        7
      );
    });
  });

  describe('concurrent execution simulation', () => {
    it('should handle concurrent executions with repository locking', async () => {
      // This test simulates race condition prevention
      // In reality, database handles locking, but executor must use transactions correctly

      const submissions = [
        { ...mockSubmission, id: 'sub-1', data: { product_images: 'TSHIRT-RED-M', quantity: 2 } },
        { ...mockSubmission, id: 'sub-2', data: { product_images: 'TSHIRT-RED-M', quantity: 3 } },
        { ...mockSubmission, id: 'sub-3', data: { product_images: 'TSHIRT-RED-M', quantity: 1 } },
      ];

      mockClient.query
        .mockResolvedValue({ rows: [] } as any);

      // Mock sequential stock decrements
      mockInventoryRepository.lockAndDecrement = jest
        .fn()
        .mockResolvedValueOnce({ ...mockInventoryRecord, stockQuantity: 48 })
        .mockResolvedValueOnce({ ...mockInventoryRecord, stockQuantity: 45 })
        .mockResolvedValueOnce({ ...mockInventoryRecord, stockQuantity: 44 });

      const results = await Promise.all(
        submissions.map((sub) => executor.execute(sub, mockTemplate, mockInventoryConfig))
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify each execution used transaction (BEGIN/COMMIT)
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
