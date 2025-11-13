/**
 * AnalyticsStrategyRegistry Unit Tests
 *
 * Tests strategy registration, selection, and fallback logic.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 */

import { AnalyticsStrategyRegistry } from '../../../../src/services/analytics/strategy-registry.service';
import { IAnalyticsStrategy } from '../../../../src/services/analytics/strategies/analytics-strategy.interface';
import { CategoryMetrics, PollMetrics, TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Mock strategy for testing registry behavior.
 * Supports specific categories for testing strategy selection.
 */
class MockPollStrategy implements IAnalyticsStrategy {
  supports(category: TemplateCategory | null): boolean {
    return category === TemplateCategory.POLLS;
  }

  async buildMetrics(
    _formId: string,
    _tenantId: string | null
  ): Promise<CategoryMetrics> {
    const metrics: PollMetrics = {
      category: 'polls',
      totalSubmissions: 100,
      voteCounts: { option_a: 60, option_b: 40 },
      votePercentages: { option_a: 60, option_b: 40 },
      uniqueVoters: 98,
      mostPopularOption: 'option_a',
      firstSubmissionAt: '2025-01-01T00:00:00Z',
      lastSubmissionAt: '2025-01-15T12:30:00Z',
    };
    return metrics;
  }
}

class MockQuizStrategy implements IAnalyticsStrategy {
  supports(category: TemplateCategory | null): boolean {
    return category === TemplateCategory.QUIZ;
  }

  async buildMetrics(
    _formId: string,
    _tenantId: string | null
  ): Promise<CategoryMetrics> {
    return {
      category: 'quiz',
      totalSubmissions: 50,
      averageScore: 75.5,
      medianScore: 80,
      passRate: 68.5,
      scoreDistribution: { '0-20': 5, '21-40': 10, '41-60': 15, '61-80': 10, '81-100': 10 },
      questionAccuracy: { q1: 85.5, q2: 62.0 },
      highestScore: 100,
      lowestScore: 15,
      firstSubmissionAt: '2025-01-01T00:00:00Z',
      lastSubmissionAt: '2025-01-15T12:30:00Z',
    };
  }
}

class MockFallbackStrategy implements IAnalyticsStrategy {
  supports(category: TemplateCategory | null): boolean {
    return category === null || category === TemplateCategory.DATA_COLLECTION;
  }

  async buildMetrics(
    _formId: string,
    _tenantId: string | null
  ): Promise<CategoryMetrics> {
    return {
      category: 'data_collection',
      totalSubmissions: 10,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalItemsOrdered: 0,
      popularItems: [],
      averageOrderSize: 0,
    };
  }
}

describe('AnalyticsStrategyRegistry', () => {
  describe('Constructor Validation', () => {
    it('should throw error when strategies array is empty', () => {
      expect(() => {
        new AnalyticsStrategyRegistry([]);
      }).toThrow('AnalyticsStrategyRegistry requires at least one strategy');
    });

    it('should throw error when strategies array is null', () => {
      expect(() => {
        new AnalyticsStrategyRegistry(null as any);
      }).toThrow('AnalyticsStrategyRegistry requires at least one strategy');
    });

    it('should throw error when strategies array is undefined', () => {
      expect(() => {
        new AnalyticsStrategyRegistry(undefined as any);
      }).toThrow('AnalyticsStrategyRegistry requires at least one strategy');
    });

    it('should throw error when no fallback strategy is provided', () => {
      expect(() => {
        new AnalyticsStrategyRegistry([new MockPollStrategy()]);
      }).toThrow('No fallback strategy found');
    });

    it('should throw error when multiple fallback strategies are provided', () => {
      expect(() => {
        new AnalyticsStrategyRegistry([
          new MockFallbackStrategy(),
          new MockFallbackStrategy(),
        ]);
      }).toThrow('Only one fallback strategy allowed');
    });

    it('should throw error when duplicate categories are registered', () => {
      class DuplicatePollStrategy extends MockPollStrategy {}

      expect(() => {
        new AnalyticsStrategyRegistry([
          new MockFallbackStrategy(),
          new MockPollStrategy(),
          new DuplicatePollStrategy(),
        ]);
      }).toThrow('Duplicate strategy registration for category "polls"');
    });

    it('should successfully construct registry with valid strategies', () => {
      expect(() => {
        new AnalyticsStrategyRegistry([
          new MockFallbackStrategy(),
          new MockPollStrategy(),
          new MockQuizStrategy(),
        ]);
      }).not.toThrow();
    });
  });

  describe('getStrategy', () => {
    let registry: AnalyticsStrategyRegistry;

    beforeEach(() => {
      registry = new AnalyticsStrategyRegistry([
        new MockFallbackStrategy(),
        new MockPollStrategy(),
        new MockQuizStrategy(),
      ]);
    });

    it('should return poll strategy for "polls" category', () => {
      const strategy = registry.getStrategy(TemplateCategory.POLLS);
      expect(strategy).toBeInstanceOf(MockPollStrategy);
      expect(strategy.supports(TemplateCategory.POLLS)).toBe(true);
    });

    it('should return quiz strategy for "quiz" category', () => {
      const strategy = registry.getStrategy(TemplateCategory.QUIZ);
      expect(strategy).toBeInstanceOf(MockQuizStrategy);
      expect(strategy.supports(TemplateCategory.QUIZ)).toBe(true);
    });

    it('should return fallback strategy for null category', () => {
      const strategy = registry.getStrategy(null);
      expect(strategy).toBeInstanceOf(MockFallbackStrategy);
      expect(strategy.supports(null)).toBe(true);
    });

    it('should return fallback strategy for undefined category', () => {
      const strategy = registry.getStrategy(undefined);
      expect(strategy).toBeInstanceOf(MockFallbackStrategy);
    });

    it('should return fallback strategy for unknown category', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const strategy = registry.getStrategy('unknown_category' as any);

      expect(strategy).toBeInstanceOf(MockFallbackStrategy);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No strategy found for category "unknown_category"')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('buildMetrics', () => {
    let registry: AnalyticsStrategyRegistry;

    beforeEach(() => {
      registry = new AnalyticsStrategyRegistry([
        new MockFallbackStrategy(),
        new MockPollStrategy(),
        new MockQuizStrategy(),
      ]);
    });

    it('should build poll metrics for polls category', async () => {
      const metrics = await registry.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        TemplateCategory.POLLS,
        'tenant-abc'
      );

      expect(metrics.category).toBe('polls');
      expect(metrics.totalSubmissions).toBe(100);
      if (metrics.category === 'polls') {
        expect(metrics.voteCounts).toEqual({ option_a: 60, option_b: 40 });
      }
    });

    it('should build quiz metrics for quiz category', async () => {
      const metrics = await registry.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        TemplateCategory.QUIZ,
        'tenant-abc'
      );

      expect(metrics.category).toBe('quiz');
      expect(metrics.totalSubmissions).toBe(50);
      if (metrics.category === 'quiz') {
        expect(metrics.averageScore).toBe(75.5);
      }
    });

    it('should build fallback metrics for null category', async () => {
      const metrics = await registry.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        null,
        'tenant-abc'
      );

      expect(metrics.category).toBe('data_collection');
      expect(metrics.totalSubmissions).toBe(10);
    });

    it('should build fallback metrics for unknown category', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const metrics = await registry.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        'unknown' as any,
        'tenant-abc'
      );

      expect(metrics.category).toBe('data_collection');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should pass tenantId to strategy', async () => {
      const buildMetricsSpy = jest.spyOn(MockPollStrategy.prototype, 'buildMetrics');

      await registry.buildMetrics(
        '123e4567-e89b-42d3-a456-426614174000',
        TemplateCategory.POLLS,
        'tenant-xyz'
      );

      expect(buildMetricsSpy).toHaveBeenCalledWith(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-xyz'
      );

      buildMetricsSpy.mockRestore();
    });
  });

  describe('hasStrategy', () => {
    let registry: AnalyticsStrategyRegistry;

    beforeEach(() => {
      registry = new AnalyticsStrategyRegistry([
        new MockFallbackStrategy(),
        new MockPollStrategy(),
      ]);
    });

    it('should return true for registered category', () => {
      expect(registry.hasStrategy(TemplateCategory.POLLS)).toBe(true);
    });

    it('should return false for unregistered category', () => {
      expect(registry.hasStrategy(TemplateCategory.QUIZ)).toBe(false);
    });

    it('should return false for null category', () => {
      expect(registry.hasStrategy(null)).toBe(false);
    });

    it('should return false for undefined category', () => {
      expect(registry.hasStrategy(undefined)).toBe(false);
    });
  });

  describe('getRegisteredCategories', () => {
    it('should return data_collection when fallback strategy is registered', () => {
      const registry = new AnalyticsStrategyRegistry([new MockFallbackStrategy()]);
      const categories = registry.getRegisteredCategories();
      expect(categories).toContain('data_collection');
      expect(categories.length).toBe(1);
    });

    it('should return all registered categories including data_collection', () => {
      const registry = new AnalyticsStrategyRegistry([
        new MockFallbackStrategy(),
        new MockPollStrategy(),
        new MockQuizStrategy(),
      ]);

      const categories = registry.getRegisteredCategories();
      expect(categories).toContain('data_collection');
      expect(categories).toContain('polls');
      expect(categories).toContain('quiz');
      expect(categories).not.toContain('');
      expect(categories.length).toBe(3);
    });

    it('should return categories in a consistent order', () => {
      const registry = new AnalyticsStrategyRegistry([
        new MockFallbackStrategy(),
        new MockPollStrategy(),
        new MockQuizStrategy(),
      ]);

      const categories1 = registry.getRegisteredCategories();
      const categories2 = registry.getRegisteredCategories();

      expect(categories1).toEqual(categories2);
    });
  });
});
