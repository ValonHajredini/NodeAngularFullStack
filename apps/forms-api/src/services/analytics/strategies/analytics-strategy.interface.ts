/**
 * Analytics Strategy Interface
 *
 * Defines the contract for category-specific analytics strategies.
 * Implements the Strategy Pattern to allow new categories without modifying existing code.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { CategoryMetrics, TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Analytics strategy interface for category-specific metrics computation.
 *
 * Each strategy is responsible for:
 * - Determining if it supports a given template category
 * - Building category-specific metrics from form submissions
 * - Aggregating JSONB submission data into typed analytics
 *
 * Implementations must be stateless and thread-safe.
 *
 * @example
 * ```typescript
 * export class PollAnalyticsStrategy implements IAnalyticsStrategy {
 *   supports(category: string): boolean {
 *     return category === 'polls';
 *   }
 *
 *   async buildMetrics(formId: string, tenantId: string): Promise<CategoryMetrics> {
 *     // Query poll submissions and compute vote counts
 *     return {
 *       category: 'polls',
 *       totalSubmissions: 150,
 *       voteCounts: { option_a: 75, option_b: 45, option_c: 30 },
 *       // ...
 *     };
 *   }
 * }
 * ```
 */
export interface IAnalyticsStrategy {
  /**
   * Determines if this strategy supports the given template category.
   *
   * Used by the registry to select the appropriate strategy for analytics computation.
   * Each strategy should return true for exactly one category (or a small set of related categories).
   *
   * @param category - Template category from TemplateCategory enum
   * @returns True if this strategy handles the category
   *
   * @example
   * ```typescript
   * const strategy = new QuizAnalyticsStrategy();
   * strategy.supports(TemplateCategory.QUIZ); // true
   * strategy.supports(TemplateCategory.POLLS); // false
   * ```
   */
  supports(category: TemplateCategory | null): boolean;

  /**
   * Builds category-specific analytics metrics for a form.
   *
   * Queries form submissions from the FORMS database, aggregates JSONB values,
   * and returns a typed CategoryMetrics object matching the form's category.
   *
   * Must handle:
   * - Empty submissions (return default metrics with zero counts)
   * - Invalid/malformed JSONB data (skip and log)
   * - Tenant isolation (filter by tenantId when multi-tenancy enabled)
   *
   * @param formId - UUID of the form to analyze
   * @param tenantId - Optional tenant ID for multi-tenant filtering (null for non-tenant mode)
   * @returns Promise containing category-specific metrics
   * @throws {Error} When database query fails or formId is invalid
   *
   * @example
   * ```typescript
   * const metrics = await strategy.buildMetrics(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'tenant-abc'
   * );
   *
   * // Result for poll category:
   * // {
   * //   category: 'polls',
   * //   totalSubmissions: 150,
   * //   voteCounts: { option_a: 75, option_b: 45, option_c: 30 },
   * //   votePercentages: { option_a: 50, option_b: 30, option_c: 20 },
   * //   uniqueVoters: 148,
   * //   mostPopularOption: 'option_a',
   * //   firstSubmissionAt: '2025-01-01T00:00:00Z',
   * //   lastSubmissionAt: '2025-01-15T12:30:00Z'
   * // }
   * ```
   */
  buildMetrics(formId: string, tenantId: string | null): Promise<CategoryMetrics>;
}
