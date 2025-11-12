/**
 * Unit tests for InventoryRepository
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.11 - Product Template with Inventory Tracking
 * Task: 10.1 - Test inventory repository methods with transaction locking
 */

import { InventoryRepository } from '../../../src/repositories/inventory.repository';
import { ProductInventory } from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';
import { PoolClient } from 'pg';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let mockClient: jest.Mocked<PoolClient>;
  let mockPool: any;

  const mockInventory: ProductInventory = {
    id: 'inv-123',
    form_id: 'form-123',
    sku: 'TSHIRT-RED-M',
    stock_quantity: 50,
    reserved_quantity: 0,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
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
    };

    // Setup database service mock
    (databaseService.getPool as jest.Mock).mockReturnValue(mockPool);

    // Create repository instance
    repository = new InventoryRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findBySku', () => {
    it('should find inventory record by SKU', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockInventory] });

      const result = await repository.findBySku('TSHIRT-RED-M');

      expect(result).toEqual(mockInventory);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM product_inventory WHERE sku = $1'),
        ['TSHIRT-RED-M']
      );
    });

    it('should return null when SKU not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findBySku('NONEXISTENT-SKU');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE sku = $1'),
        ['NONEXISTENT-SKU']
      );
    });

    it('should use parameterized queries for SQL injection prevention', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockInventory] });

      await repository.findBySku("'; DROP TABLE product_inventory; --");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE product_inventory; --"]
      );
    });
  });

  describe('lockAndDecrement', () => {
    it('should successfully lock and decrement stock with sufficient quantity', async () => {
      // Mock SELECT FOR UPDATE query
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 50 }],
        })
        // Mock UPDATE query
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 48 }],
        });

      const result = await repository.lockAndDecrement(mockClient, 'TSHIRT-RED-M', 2);

      expect(result.stock_quantity).toBe(48);

      // Verify SELECT FOR UPDATE was called
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FOR UPDATE'),
        ['TSHIRT-RED-M']
      );

      // Verify UPDATE was called
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE product_inventory'),
        [2, 'TSHIRT-RED-M']
      );
    });

    it('should throw error when SKU not found during lock', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        repository.lockAndDecrement(mockClient, 'NONEXISTENT-SKU', 1)
      ).rejects.toThrow('SKU not found: NONEXISTENT-SKU');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        ['NONEXISTENT-SKU']
      );
    });

    it('should throw error when insufficient stock', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ ...mockInventory, stock_quantity: 3 }],
      });

      await expect(
        repository.lockAndDecrement(mockClient, 'TSHIRT-RED-M', 5)
      ).rejects.toThrow('Insufficient stock. Available: 3, Requested: 5');
    });

    it('should prevent negative stock quantities', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ ...mockInventory, stock_quantity: 1 }],
      });

      await expect(
        repository.lockAndDecrement(mockClient, 'TSHIRT-RED-M', 10)
      ).rejects.toThrow('Insufficient stock');
    });

    it('should handle edge case: exactly zero stock remaining', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 5 }],
        })
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 0 }],
        });

      const result = await repository.lockAndDecrement(mockClient, 'TSHIRT-RED-M', 5);

      expect(result.stock_quantity).toBe(0);
    });

    it('should use row-level locking (FOR UPDATE) to prevent race conditions', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 10 }],
        })
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 8 }],
        });

      await repository.lockAndDecrement(mockClient, 'TSHIRT-RED-M', 2);

      const lockQuery = (mockClient.query as jest.Mock).mock.calls[0][0];
      expect(lockQuery).toContain('FOR UPDATE');
    });

    it('should update timestamp during decrement', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 10 }],
        })
        .mockResolvedValueOnce({
          rows: [{ ...mockInventory, stock_quantity: 8 }],
        });

      await repository.lockAndDecrement(mockClient, 'TSHIRT-RED-M', 2);

      const updateQuery = (mockClient.query as jest.Mock).mock.calls[1][0];
      expect(updateQuery).toContain('updated_at = CURRENT_TIMESTAMP');
    });
  });

  describe('checkAvailability', () => {
    it('should return true when sufficient stock available', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ available: true }],
      });

      const result = await repository.checkAvailability('TSHIRT-RED-M', 5);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('stock_quantity >= $1'),
        [5, 'TSHIRT-RED-M']
      );
    });

    it('should return false when insufficient stock', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ available: false }],
      });

      const result = await repository.checkAvailability('TSHIRT-RED-M', 100);

      expect(result).toBe(false);
    });

    it('should return false when SKU not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.checkAvailability('NONEXISTENT-SKU', 1);

      expect(result).toBe(false);
    });

    it('should perform non-locking read (pre-validation)', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ available: true }],
      });

      await repository.checkAvailability('TSHIRT-RED-M', 1);

      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(query).not.toContain('FOR UPDATE');
    });

    it('should handle edge case: checking for zero quantity', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ available: true }],
      });

      const result = await repository.checkAvailability('TSHIRT-RED-M', 0);

      expect(result).toBe(true);
    });
  });

  describe('create', () => {
    it('should create new inventory record', async () => {
      const newInventory: Partial<ProductInventory> = {
        form_id: 'form-456',
        sku: 'TSHIRT-BLUE-L',
        stock_quantity: 100,
        reserved_quantity: 0,
      };

      mockClient.query.mockResolvedValue({
        rows: [{ ...newInventory, id: 'inv-456', created_at: new Date(), updated_at: new Date() }],
      });

      const result = await repository.create(newInventory);

      expect(result.sku).toBe('TSHIRT-BLUE-L');
      expect(result.stock_quantity).toBe(100);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_inventory'),
        expect.arrayContaining(['form-456', 'TSHIRT-BLUE-L', 100, 0])
      );
    });
  });

  describe('update', () => {
    it('should update inventory stock quantity', async () => {
      const updates: Partial<ProductInventory> = {
        stock_quantity: 75,
      };

      mockClient.query.mockResolvedValue({
        rows: [{ ...mockInventory, stock_quantity: 75 }],
      });

      const result = await repository.update('inv-123', updates);

      expect(result.stock_quantity).toBe(75);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_inventory'),
        expect.arrayContaining([75, 'inv-123'])
      );
    });
  });

  describe('SQL injection prevention', () => {
    it('should sanitize SKU input in all methods', async () => {
      const maliciousSku = "'; DELETE FROM product_inventory; --";

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findBySku(maliciousSku);
      await repository.checkAvailability(maliciousSku, 1);

      // Verify parameterized queries used
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([maliciousSku])
      );
    });
  });

  describe('performance considerations', () => {
    it('should use indexed queries for fast lookups', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockInventory] });

      await repository.findBySku('TSHIRT-RED-M');

      const query = (mockPool.query as jest.Mock).mock.calls[0][0];
      // Query should use indexed column (sku)
      expect(query).toContain('WHERE sku = $1');
    });
  });
});
