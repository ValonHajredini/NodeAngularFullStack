/**
 * Generic Analytics Strategy
 *
 * Fallback strategy for forms without category metadata or unknown categories.
 * Provides basic analytics: submission counts, timestamps, and generic aggregations.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { CategoryMetrics, RestaurantMetrics, TemplateCategory } from '@nodeangularfullstack/shared';
import { AnalyticsRepository } from '../../../repositories/analytics.repository';

/**
 * Generic/fallback analytics strategy.
 *
 * Used when:
 * - Form has no category metadata
 * - Category is not recognized by specialized strategies
 * - Legacy forms without template categorization
 *
 * Returns RestaurantMetrics with 'data_collection' category as the most generic
 * form of analytics. Provides:
 * - Total submission count
 * - First/last submission timestamps
 * - Basic aggregations (no category-specific logic)
 *
 * Preserves backward compatibility with existing analytics endpoints that
 * return generic counts and timestamps.
 *
 * @example
 * ```typescript
 * const strategy = new GenericAnalyticsStrategy(analyticsRepository);
 * const metrics = await strategy.buildMetrics(formId, tenantId);
 * // Returns basic metrics with 'data_collection' category
 * ```
 */
export class GenericAnalyticsStrategy implements IAnalyticsStrategy {
  /**
   * Analytics repository for querying submission data.
   * Injected via constructor for testability.
   */
  private repository: AnalyticsRepository;

  /**
   * Creates a new generic analytics strategy.
   *
   * @param repository - Analytics repository instance
   *
   * @example
   * ```typescript
   * const strategy = new GenericAnalyticsStrategy(analyticsRepository);
   * ```
   */
  constructor(repository: AnalyticsRepository) {
    this.repository = repository;
  }

  /**
   * Determines if this strategy supports the given category.
   *
   * Generic strategy supports:
   * - Null values (forms without category metadata)
   *
   * This is the fallback strategy for forms without specialized analytics requirements.
   * Note: DATA_COLLECTION category is now handled by RestaurantAnalyticsStrategy (Story 30.4).
   *
   * @param category - Template category from TemplateCategory enum
   * @returns True for null categories only
   *
   * @example
   * ```typescript
   * strategy.supports(null); // true (fallback for uncategorized forms)
   * strategy.supports(TemplateCategory.DATA_COLLECTION); // false (RestaurantAnalyticsStrategy handles this)
   * strategy.supports(TemplateCategory.POLLS); // false (specialized strategy handles this)
   * ```
   */
  supports(category: TemplateCategory | null): boolean {
    // Only support null (uncategorized forms) - RestaurantAnalyticsStrategy handles DATA_COLLECTION
    return category === null;
  }

  /**
   * Builds generic analytics metrics for a form.
   *
   * Queries:
   * - Submission counts and time range (via repository)
   * - No category-specific aggregations
   *
   * Returns RestaurantMetrics (data_collection category) with minimal fields:
   * - totalSubmissions
   * - firstSubmissionAt
   * - lastSubmissionAt
   * - Default values for category-specific fields (zeroes, empty arrays)
   *
   * This ensures the response conforms to CategoryMetrics union while providing
   * basic analytics for forms without specialized handling.
   *
   * @param formId - UUID of the form to analyze
   * @param tenantId - Optional tenant ID for multi-tenant filtering
   * @returns Promise containing generic analytics metrics
   * @throws {Error} When database query fails or formId is invalid
   *
   * @example
   * ```typescript
   * const metrics = await strategy.buildMetrics(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'tenant-abc'
   * );
   * // {
   * //   category: 'data_collection',
   * //   totalSubmissions: 150,
   * //   firstSubmissionAt: '2025-01-01T00:00:00Z',
   * //   lastSubmissionAt: '2025-01-15T12:30:00Z',
   * //   totalRevenue: 0,
   * //   averageOrderValue: 0,
   * //   totalItemsOrdered: 0,
   * //   popularItems: [],
   * //   averageOrderSize: 0
   * // }
   * ```
   */
  async buildMetrics(
    formId: string,
    tenantId: string | null
  ): Promise<CategoryMetrics> {
    try {
      // Fetch basic submission counts and time range
      const counts = await this.repository.getSubmissionCounts(formId, tenantId);

      // Return generic metrics as RestaurantMetrics (data_collection category)
      // This is the most generic category for forms without specific business logic
      const metrics: RestaurantMetrics = {
        category: 'data_collection',
        totalSubmissions: counts.totalSubmissions,
        firstSubmissionAt: counts.firstSubmissionAt || undefined,
        lastSubmissionAt: counts.lastSubmissionAt || undefined,
        // Generic defaults for category-specific fields
        totalRevenue: 0,
        averageOrderValue: 0,
        totalItemsOrdered: 0,
        popularItems: [],
        averageOrderSize: 0,
      };

      return metrics;
    } catch (error: any) {
      console.error(
        `[GenericAnalyticsStrategy] Error building metrics for form ${formId}:`,
        error
      );
      throw new Error(`Failed to build generic analytics: ${error.message}`);
    }
  }
}
