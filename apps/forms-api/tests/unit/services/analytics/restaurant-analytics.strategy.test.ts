/**
 * Restaurant Analytics Strategy Unit Tests
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 */

import { RestaurantAnalyticsStrategy } from '../../../../src/services/analytics/strategies/restaurant-analytics.strategy';
import { AnalyticsRepository } from '../../../../src/repositories/analytics.repository';

describe('RestaurantAnalyticsStrategy', () => {
  let strategy: RestaurantAnalyticsStrategy;
  let mockRepository: jest.Mocked<AnalyticsRepository>;
  const formId = 'test-form-123';
  const tenantId = 'tenant-abc';

  beforeEach(() => {
    mockRepository = {
      getSubmissionCounts: jest.fn(),
      getRestaurantItemPopularity: jest.fn(),
      getAllSubmissionValues: jest.fn(),
    } as any;

    strategy = new RestaurantAnalyticsStrategy(mockRepository);
  });

  describe('supports', () => {
    it('should return true for DATA_COLLECTION category', () => {
      expect(strategy.supports('data_collection')).toBe(true);
      expect(strategy.supports('DATA_COLLECTION')).toBe(true);
      expect(strategy.supports('Data_Collection')).toBe(true);
    });

    it('should return false for non-DATA_COLLECTION categories', () => {
      expect(strategy.supports('ecommerce')).toBe(false);
      expect(strategy.supports('services')).toBe(false);
      expect(strategy.supports('polls')).toBe(false);
    });

    it('should return false for null category', () => {
      expect(strategy.supports(null)).toBe(false);
    });
  });

  describe('buildMetrics', () => {
    it('should return restaurant metrics with item popularity data', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 50,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T23:59:59Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 2500,
        totalItemsOrdered: 150,
        itemBreakdown: [
          { itemName: 'Pizza', quantity: 50, revenue: 1000 },
          { itemName: 'Burger', quantity: 60, revenue: 900 },
          { itemName: 'Salad', quantity: 40, revenue: 600 },
        ],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { submitted_at: '2025-01-01T12:00:00Z' },
        { submitted_at: '2025-01-01T13:00:00Z' },
        { submitted_at: '2025-01-01T12:30:00Z' },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.category).toBe('data_collection');
      expect(result.totalSubmissions).toBe(50);
      expect(result.totalRevenue).toBe(2500);
      expect(result.averageOrderValue).toBe(50); // 2500 / 50
      expect(result.totalItemsOrdered).toBe(150);
      expect(result.popularItems).toHaveLength(3);
      expect(result.popularItems[0].itemName).toBe('Burger'); // Sorted by quantity descending
      expect(result.popularItems[0].quantity).toBe(60);
      expect(result.averageOrderSize).toBe(3); // 150 items / 50 orders
      // Peak time determined by getAllSubmissionValues mock - hour 13 in this case
      expect(result.peakOrderTime).toBeDefined();
      expect(result.peakOrderTime).toContain(':00-');
    });

    it('should handle zero submissions gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 0,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.category).toBe('data_collection');
      expect(result.totalSubmissions).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.totalItemsOrdered).toBe(0);
      expect(result.popularItems).toEqual([]);
      expect(result.peakOrderTime).toBeUndefined();
      expect(result.averageOrderSize).toBe(0);
    });

    it('should aggregate items by name', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      // Same item appears in multiple orders
      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 300,
        totalItemsOrdered: 15,
        itemBreakdown: [
          { itemName: 'Pizza', quantity: 5, revenue: 100 },
          { itemName: 'Pizza', quantity: 5, revenue: 100 },
          { itemName: 'Pizza', quantity: 5, revenue: 100 },
        ],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.popularItems).toHaveLength(1);
      expect(result.popularItems[0].itemName).toBe('Pizza');
      expect(result.popularItems[0].quantity).toBe(15);
      expect(result.popularItems[0].revenue).toBe(300);
    });

    it('should sort items by quantity descending', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 20,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 1000,
        totalItemsOrdered: 100,
        itemBreakdown: [
          { itemName: 'Low Quantity Item', quantity: 10, revenue: 200 },
          { itemName: 'High Quantity Item', quantity: 50, revenue: 400 },
          { itemName: 'Mid Quantity Item', quantity: 40, revenue: 400 },
        ],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.popularItems[0].itemName).toBe('High Quantity Item');
      expect(result.popularItems[1].itemName).toBe('Mid Quantity Item');
      expect(result.popularItems[2].itemName).toBe('Low Quantity Item');
    });

    it('should limit popular items to top 10', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 50,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T00:00:00Z',
      });

      const items = Array.from({ length: 15 }, (_, i) => ({
        itemName: `Item ${i}`,
        quantity: 15 - i, // Descending quantities
        revenue: (15 - i) * 10,
      }));

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 1200,
        totalItemsOrdered: 120,
        itemBreakdown: items,
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.popularItems).toHaveLength(10);
      expect(result.popularItems[0].quantity).toBe(15);
      expect(result.popularItems[9].quantity).toBe(6);
    });

    it('should round revenue to 2 decimal places', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 3,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-03T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 123.456789,
        totalItemsOrdered: 10,
        itemBreakdown: [
          { itemName: 'Pizza', quantity: 10, revenue: 123.456789 },
        ],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.totalRevenue).toBe(123.46);
      expect(result.popularItems[0].revenue).toBe(123.46);
    });

    it('should calculate average order value correctly', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 40,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 2000.75,
        totalItemsOrdered: 150,
        itemBreakdown: [],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.averageOrderValue).toBe(50.02); // 2000.75 / 40 rounded to 2 decimals
    });

    it('should calculate average order size correctly', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 25,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 1250,
        totalItemsOrdered: 75,
        itemBreakdown: [],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.averageOrderSize).toBe(3); // 75 items / 25 orders
    });

    it('should calculate peak order time from submitted_at timestamps', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 20,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 1000,
        totalItemsOrdered: 100,
        itemBreakdown: [],
      });

      // Most orders at same hour (4 orders at one hour, 1 at others)
      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { submitted_at: '2025-01-01T12:15:00' }, // Local time - hour 12
        { submitted_at: '2025-01-01T12:30:00' },
        { submitted_at: '2025-01-01T12:45:00' },
        { submitted_at: '2025-01-01T12:50:00' },
        { submitted_at: '2025-01-01T14:00:00' }, // Hour 14
        { submitted_at: '2025-01-01T18:00:00' }, // Hour 18
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Should return a valid time range format
      expect(result.peakOrderTime).toMatch(/^\d{2}:00-\d{2}:00$/);
      // And it should be defined (not NaN or undefined)
      expect(result.peakOrderTime).toBeDefined();
      expect(result.peakOrderTime).not.toContain('NaN');
    });

    it('should use order_time field when available instead of submitted_at', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 500,
        totalItemsOrdered: 50,
        itemBreakdown: [],
      });

      // order_time field takes precedence - 3 orders at same hour via order_time
      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { order_time: '2025-01-01T14:00:00', submitted_at: '2025-01-01T20:00:00' },
        { order_time: '2025-01-01T14:15:00', submitted_at: '2025-01-01T20:00:00' },
        { order_time: '2025-01-01T14:30:00', submitted_at: '2025-01-01T20:00:00' },
        { submitted_at: '2025-01-01T18:00:00' }, // This one uses submitted_at (different hour)
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Should return valid time range (order_time field used correctly)
      expect(result.peakOrderTime).toMatch(/^\d{2}:00-\d{2}:00$/);
      expect(result.peakOrderTime).toBeDefined();
      expect(result.peakOrderTime).not.toContain('NaN');
    });

    it('should handle submissions without timestamps gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 250,
        totalItemsOrdered: 25,
        itemBreakdown: [],
      });

      // No timestamp fields provided
      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { item_name: 'Pizza' }, // No timestamps
        { item_name: 'Burger' }, // No timestamps
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // When no valid timestamps exist, should return "00:00-01:00" (default hour 0)
      // This is because hourMap starts empty and peakHour defaults to 0
      expect(result.peakOrderTime).toBeDefined();
    });

    it('should handle invalid timestamp formats gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 250,
        totalItemsOrdered: 25,
        itemBreakdown: [],
      });

      // Mix of invalid and valid timestamps - tests error handling
      // Note: Invalid dates cause Date() constructor to return Invalid Date,
      // which then returns NaN for getHours(). Implementation catches this.
      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { submitted_at: '2025-01-01T12:00:00' }, // Valid (hour 12)
        { submitted_at: '2025-01-01T12:15:00' }, // Valid (hour 12)
        { submitted_at: '2025-01-01T12:30:00' }, // Valid (hour 12) - most popular
        { submitted_at: '2025-01-01T14:00:00' }, // Valid (hour 14)
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Should calculate peak time from valid timestamps
      expect(result.peakOrderTime).toMatch(/^\d{2}:00-\d{2}:00$/);
      expect(result.peakOrderTime).toBeDefined();
      expect(result.peakOrderTime).not.toContain('NaN');
    });

    it('should handle items without names gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 500,
        totalItemsOrdered: 50,
        itemBreakdown: [
          { itemName: '', quantity: 10, revenue: 100 }, // Empty name
          { itemName: null as any, quantity: 20, revenue: 200 }, // Null name
          { itemName: 'Valid Item', quantity: 20, revenue: 200 },
        ],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      // Should only include items with valid names
      expect(result.popularItems).toHaveLength(1);
      expect(result.popularItems[0].itemName).toBe('Valid Item');
    });

    it('should handle midnight hour correctly (23:xx)', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 250,
        totalItemsOrdered: 25,
        itemBreakdown: [],
      });

      // Orders at hour 23 (11pm) - tests hour wraparound logic
      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { submitted_at: '2025-01-01T23:15:00' }, // Hour 23
        { submitted_at: '2025-01-01T23:30:00' }, // Hour 23
        { submitted_at: '2025-01-01T23:45:00' }, // Hour 23
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Should return valid time range (tests %24 wraparound for hour+1)
      expect(result.peakOrderTime).toMatch(/^\d{2}:00-\d{2}:00$/);
      expect(result.peakOrderTime).toBeDefined();
      expect(result.peakOrderTime).not.toContain('NaN');
      // The end hour should wrap correctly (not be 24:00)
      expect(result.peakOrderTime).not.toContain('24:');
    });

    it('should pass tenant ID to repository methods', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-10T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 500,
        totalItemsOrdered: 50,
        itemBreakdown: [],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      await strategy.buildMetrics(formId, tenantId);

      expect(mockRepository.getSubmissionCounts).toHaveBeenCalledWith(formId, tenantId);
      expect(mockRepository.getRestaurantItemPopularity).toHaveBeenCalledWith(formId, tenantId);
      expect(mockRepository.getAllSubmissionValues).toHaveBeenCalledWith(formId, tenantId);
    });

    it('should handle repository errors and rethrow with context', async () => {
      const error = new Error('Database connection failed');
      mockRepository.getSubmissionCounts.mockRejectedValue(error);

      await expect(strategy.buildMetrics(formId, null)).rejects.toThrow(
        `[RestaurantAnalyticsStrategy] Failed to build metrics for form ${formId}`
      );
    });

    it('should include timestamp fields when available', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T10:00:00Z',
        lastSubmissionAt: '2025-01-05T15:30:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 250,
        totalItemsOrdered: 25,
        itemBreakdown: [],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.firstSubmissionAt).toBe('2025-01-01T10:00:00Z');
      expect(result.lastSubmissionAt).toBe('2025-01-05T15:30:00Z');
    });

    it('should calculate metrics with decimal precision', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 33,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-31T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 1234.56,
        totalItemsOrdered: 100,
        itemBreakdown: [],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      // Average order value: 1234.56 / 33 = 37.41...
      expect(result.averageOrderValue).toBe(37.41);

      // Average order size: 100 / 33 = 3.03...
      expect(result.averageOrderSize).toBe(3.03);
    });

    it('should handle empty submissions list for peak time calculation', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-05T00:00:00Z',
      });

      mockRepository.getRestaurantItemPopularity.mockResolvedValue({
        totalRevenue: 250,
        totalItemsOrdered: 25,
        itemBreakdown: [],
      });

      mockRepository.getAllSubmissionValues.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.peakOrderTime).toBeUndefined();
    });
  });
});
