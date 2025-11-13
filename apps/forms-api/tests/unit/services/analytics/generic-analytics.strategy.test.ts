/**
 * GenericAnalyticsStrategy Unit Tests
 *
 * Tests generic/fallback analytics strategy behavior.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 */

import { GenericAnalyticsStrategy } from '../../../../src/services/analytics/strategies/generic-analytics.strategy';
import { AnalyticsRepository } from '../../../../src/repositories/analytics.repository';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Mock analytics repository for testing.
 * Allows controlled responses for submission counts.
 */
class MockAnalyticsRepository {
  async getSubmissionCounts(
    _formSchemaId: string,
    _tenantId: string | null
  ): Promise<{
    totalSubmissions: number;
    firstSubmissionAt: string | null;
    lastSubmissionAt: string | null;
  }> {
    return {
      totalSubmissions: 150,
      firstSubmissionAt: '2025-01-01T00:00:00.000Z',
      lastSubmissionAt: '2025-01-15T12:30:00.000Z',
    };
  }

  async getChoiceBreakdown() {
    return [];
  }

  async getSubmissionsByTimeWindow() {
    return [];
  }

  async getAllSubmissionValues() {
    return [];
  }
}

describe('GenericAnalyticsStrategy', () => {
  let strategy: GenericAnalyticsStrategy;
  let mockRepository: MockAnalyticsRepository;

  beforeEach(() => {
    mockRepository = new MockAnalyticsRepository();
    strategy = new GenericAnalyticsStrategy(mockRepository as any);
  });

  describe('supports', () => {
    it('should return true for null (fallback indicator)', () => {
      expect(strategy.supports(null)).toBe(true);
    });

    it('should return true for DATA_COLLECTION category', () => {
      expect(strategy.supports(TemplateCategory.DATA_COLLECTION)).toBe(true);
    });

    it('should return false for POLLS category', () => {
      expect(strategy.supports(TemplateCategory.POLLS)).toBe(false);
    });

    it('should return false for QUIZ category', () => {
      expect(strategy.supports(TemplateCategory.QUIZ)).toBe(false);
    });

    it('should return false for ECOMMERCE category', () => {
      expect(strategy.supports(TemplateCategory.ECOMMERCE)).toBe(false);
    });

    it('should return false for SERVICES category', () => {
      expect(strategy.supports(TemplateCategory.SERVICES)).toBe(false);
    });

    it('should return false for EVENTS category', () => {
      expect(strategy.supports(TemplateCategory.EVENTS)).toBe(false);
    });
  });

  describe('buildMetrics', () => {
    it('should build metrics with data_collection category', async () => {
      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.category).toBe('data_collection');
    });

    it('should return submission counts from repository', async () => {
      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.totalSubmissions).toBe(150);
    });

    it('should return first submission timestamp', async () => {
      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.firstSubmissionAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should return last submission timestamp', async () => {
      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.lastSubmissionAt).toBe('2025-01-15T12:30:00.000Z');
    });

    it('should return zero values for category-specific fields', async () => {
      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      if (metrics.category === 'data_collection') {
        expect(metrics.totalRevenue).toBe(0);
        expect(metrics.averageOrderValue).toBe(0);
        expect(metrics.totalItemsOrdered).toBe(0);
        expect(metrics.popularItems).toEqual([]);
        expect(metrics.averageOrderSize).toBe(0);
      }
    });

    it('should handle null tenantId', async () => {
      const getSubmissionCountsSpy = jest.spyOn(
        mockRepository,
        'getSubmissionCounts'
      );

      await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(getSubmissionCountsSpy).toHaveBeenCalledWith(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );
    });

    it('should handle empty submissions (zero count)', async () => {
      mockRepository.getSubmissionCounts = jest.fn().mockResolvedValue({
        totalSubmissions: 0,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      });

      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.totalSubmissions).toBe(0);
      expect(metrics.firstSubmissionAt).toBeUndefined();
      expect(metrics.lastSubmissionAt).toBeUndefined();
    });

    it('should convert null timestamps to undefined', async () => {
      mockRepository.getSubmissionCounts = jest.fn().mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      });

      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.firstSubmissionAt).toBeUndefined();
      expect(metrics.lastSubmissionAt).toBeUndefined();
    });

    it('should throw error when repository fails', async () => {
      const errorMessage = 'Database connection error';
      mockRepository.getSubmissionCounts = jest
        .fn()
        .mockRejectedValue(new Error(errorMessage));

      await expect(
        strategy.buildMetrics(
          '123e4567-e89b-42d3-a456-426614174000',
          'tenant-abc'
        )
      ).rejects.toThrow('Failed to build generic analytics');
    });

    it('should log error when repository fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepository.getSubmissionCounts = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      try {
        await strategy.buildMetrics(
          '123e4567-e89b-42d3-a456-426614174000',
          'tenant-abc'
        );
      } catch (error) {
        // Expected error
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('GenericAnalyticsStrategy'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should pass formId to repository', async () => {
      const formId = '987fcdeb-51a2-4321-bcde-123456789abc';
      const getSubmissionCountsSpy = jest.spyOn(
        mockRepository,
        'getSubmissionCounts'
      );

      await strategy.buildMetrics(formId, 'tenant-abc');

      expect(getSubmissionCountsSpy).toHaveBeenCalledWith(formId, 'tenant-abc');
    });

    it('should handle large submission counts', async () => {
      mockRepository.getSubmissionCounts = jest.fn().mockResolvedValue({
        totalSubmissions: 999999,
        firstSubmissionAt: '2024-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-12-31T23:59:59.000Z',
      });

      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      expect(metrics.totalSubmissions).toBe(999999);
    });

    it('should return RestaurantMetrics type structure', async () => {
      const metrics = await strategy.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      // Verify it matches RestaurantMetrics structure
      expect(metrics).toHaveProperty('category', 'data_collection');
      expect(metrics).toHaveProperty('totalSubmissions');
      expect(metrics).toHaveProperty('totalRevenue');
      expect(metrics).toHaveProperty('averageOrderValue');
      expect(metrics).toHaveProperty('totalItemsOrdered');
      expect(metrics).toHaveProperty('popularItems');
      expect(metrics).toHaveProperty('averageOrderSize');
    });
  });

  describe('Integration with AnalyticsRepository', () => {
    it('should work with real AnalyticsRepository instance', () => {
      const realRepository = new AnalyticsRepository();
      const strategyWithRealRepo = new GenericAnalyticsStrategy(realRepository);

      expect(strategyWithRealRepo).toBeInstanceOf(GenericAnalyticsStrategy);
      expect(strategyWithRealRepo.supports(null)).toBe(true);
      expect(strategyWithRealRepo.supports(TemplateCategory.DATA_COLLECTION)).toBe(true);
    });
  });
});
