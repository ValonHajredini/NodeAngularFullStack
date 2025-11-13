/**
 * Product Analytics Strategy Unit Tests
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 */

import { ProductAnalyticsStrategy } from '../../../../src/services/analytics/strategies/product-analytics.strategy';
import { AnalyticsRepository } from '../../../../src/repositories/analytics.repository';

describe('ProductAnalyticsStrategy', () => {
  let strategy: ProductAnalyticsStrategy;
  let mockRepository: jest.Mocked<AnalyticsRepository>;
  const formId = 'test-form-123';
  const tenantId = 'tenant-abc';

  beforeEach(() => {
    mockRepository = {
      getSubmissionCounts: jest.fn(),
      getProductSalesData: jest.fn(),
    } as any;

    strategy = new ProductAnalyticsStrategy(mockRepository);
  });

  describe('supports', () => {
    it('should return true for ECOMMERCE category', () => {
      expect(strategy.supports('ecommerce')).toBe(true);
      expect(strategy.supports('ECOMMERCE')).toBe(true);
      expect(strategy.supports('Ecommerce')).toBe(true);
    });

    it('should return false for non-ECOMMERCE categories', () => {
      expect(strategy.supports('polls')).toBe(false);
      expect(strategy.supports('quiz')).toBe(false);
      expect(strategy.supports('services')).toBe(false);
    });

    it('should return false for null category', () => {
      expect(strategy.supports(null)).toBe(false);
    });
  });

  describe('buildMetrics', () => {
    it('should return product metrics with sales data', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 100,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T23:59:59Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 5000,
        totalItemsSold: 250,
        productBreakdown: [
          { productId: 'prod-1', name: 'Widget', quantity: 100, revenue: 2000 },
          { productId: 'prod-2', name: 'Gadget', quantity: 150, revenue: 3000 },
        ],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.category).toBe('ecommerce');
      expect(result.totalSubmissions).toBe(100);
      expect(result.totalRevenue).toBe(5000);
      expect(result.averageOrderValue).toBe(50);
      expect(result.totalItemsSold).toBe(250);
      expect(result.topProducts).toHaveLength(2);
      expect(result.topProducts[0].productId).toBe('prod-2'); // Sorted by revenue descending
    });

    it('should handle zero submissions gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 0,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.category).toBe('ecommerce');
      expect(result.totalSubmissions).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.totalItemsSold).toBe(0);
      expect(result.topProducts).toEqual([]);
    });

    it('should aggregate products by ID', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 3,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-03T00:00:00Z',
      });

      // Same product ID appears multiple times
      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 300,
        totalItemsSold: 15,
        productBreakdown: [
          { productId: 'prod-1', name: 'Widget', quantity: 5, revenue: 100 },
          { productId: 'prod-1', name: 'Widget', quantity: 5, revenue: 100 },
          { productId: 'prod-1', name: 'Widget', quantity: 5, revenue: 100 },
        ],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].productId).toBe('prod-1');
      expect(result.topProducts[0].quantity).toBe(15);
      expect(result.topProducts[0].revenue).toBe(300);
    });

    it('should sort products by revenue descending', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 1000,
        totalItemsSold: 100,
        productBreakdown: [
          { productId: 'prod-1', name: 'Low Revenue', quantity: 50, revenue: 100 },
          { productId: 'prod-2', name: 'High Revenue', quantity: 25, revenue: 500 },
          { productId: 'prod-3', name: 'Mid Revenue', quantity: 25, revenue: 400 },
        ],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.topProducts[0].productId).toBe('prod-2');
      expect(result.topProducts[1].productId).toBe('prod-3');
      expect(result.topProducts[2].productId).toBe('prod-1');
    });

    it('should limit top products to 10 items', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 20,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-20T00:00:00Z',
      });

      const products = Array.from({ length: 15 }, (_, i) => ({
        productId: `prod-${i}`,
        name: `Product ${i}`,
        quantity: i + 1,
        revenue: (i + 1) * 10,
      }));

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 1200,
        totalItemsSold: 120,
        productBreakdown: products,
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.topProducts).toHaveLength(10);
    });

    it('should round revenue to 2 decimal places', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 3,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-03T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 123.456789,
        totalItemsSold: 10,
        productBreakdown: [
          { productId: 'prod-1', name: 'Widget', quantity: 10, revenue: 123.456789 },
        ],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.totalRevenue).toBe(123.46);
      expect(result.topProducts[0].revenue).toBe(123.46);
    });

    it('should calculate average order value correctly', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 50,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 2500.75,
        totalItemsSold: 200,
        productBreakdown: [],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.averageOrderValue).toBe(50.02); // 2500.75 / 50 rounded to 2 decimals
    });

    it('should handle products without productId gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 500,
        totalItemsSold: 50,
        productBreakdown: [
          { productId: '', name: 'Missing ID', quantity: 10, revenue: 100 },
          { productId: 'prod-1', name: 'Valid Product', quantity: 40, revenue: 400 },
        ],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].productId).toBe('prod-1');
    });

    it('should pass tenant ID to repository methods', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 1000,
        totalItemsSold: 100,
        productBreakdown: [],
      });

      await strategy.buildMetrics(formId, tenantId);

      expect(mockRepository.getSubmissionCounts).toHaveBeenCalledWith(formId, tenantId);
      expect(mockRepository.getProductSalesData).toHaveBeenCalledWith(formId, tenantId);
    });

    it('should handle repository errors and rethrow with context', async () => {
      const error = new Error('Database connection failed');
      mockRepository.getSubmissionCounts.mockRejectedValue(error);

      await expect(strategy.buildMetrics(formId, null)).rejects.toThrow(
        `[ProductAnalyticsStrategy] Failed to build metrics for form ${formId}`
      );
    });

    it('should set low stock alerts to 0 (placeholder)', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 1000,
        totalItemsSold: 100,
        productBreakdown: [],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.lowStockAlerts).toBe(0);
      expect(result.outOfStockCount).toBe(0);
      expect(result.inventoryValue).toBe(0);
    });

    it('should include timestamp fields when available', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T10:00:00Z',
        lastSubmissionAt: '2025-01-05T15:30:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 500,
        totalItemsSold: 50,
        productBreakdown: [],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.firstSubmissionAt).toBe('2025-01-01T10:00:00Z');
      expect(result.lastSubmissionAt).toBe('2025-01-05T15:30:00Z');
    });

    it('should use "Unknown Product" for items without name', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getProductSalesData.mockResolvedValue({
        totalRevenue: 500,
        totalItemsSold: 50,
        productBreakdown: [
          { productId: 'prod-1', name: '', quantity: 50, revenue: 500 },
        ],
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.topProducts[0].name).toBe('Unknown Product');
    });
  });
});
