/**
 * Analytics Strategy Interface
 *
 * Defines the contract for category-specific analytics strategies.
 * Each strategy implements specialized metrics calculation for a template category.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { CategoryMetrics, TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Base interface for all analytics strategies.
 * Implements Strategy pattern for category-specific analytics calculation.
 *
 * @example
 * ```typescript
 * class QuizAnalyticsStrategy implements IAnalyticsStrategy {
 *   readonly category = TemplateCategory.QUIZ;
 *
 *   async calculateMetrics(formSchemaId: string): Promise<CategoryMetrics> {
 *     // Calculate quiz-specific metrics (scores, pass rate, etc.)
 *     return { category: 'quiz', ... };
 *   }
 * }
 * ```
 */
export interface IAnalyticsStrategy {
  /**
   * Template category this strategy handles
   */
  readonly category: TemplateCategory | null;

  /**
   * Calculate category-specific metrics for a form
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @returns Category-specific metrics object (discriminated union)
   *
   * @throws {Error} If form not found or no submissions available
   * @throws {Error} If database query fails
   */
  calculateMetrics(formSchemaId: string): Promise<CategoryMetrics>;
}

/**
 * Type guard to check if strategy handles a specific category
 *
 * @param strategy - Strategy instance to check
 * @param category - Category to match
 * @returns True if strategy handles the category
 */
export function isStrategyForCategory(
  strategy: IAnalyticsStrategy,
  category: TemplateCategory | null
): boolean {
  return strategy.category === category;
}
