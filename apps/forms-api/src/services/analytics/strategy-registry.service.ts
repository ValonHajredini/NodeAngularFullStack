/**
 * Analytics Strategy Registry Service
 *
 * Manages registration and selection of analytics strategies based on template category.
 * Implements the Registry/Factory Pattern to instantiate appropriate strategies.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { IAnalyticsStrategy } from './strategies/analytics-strategy.interface';
import { CategoryMetrics, TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Registry service for analytics strategies.
 *
 * Responsibilities:
 * - Manages a collection of analytics strategies
 * - Selects the appropriate strategy based on template category
 * - Provides fallback to generic strategy for unknown categories
 * - Logs warnings when category metadata is missing or unsupported
 *
 * Strategies are registered via constructor injection and stored as singletons.
 *
 * @example
 * ```typescript
 * // Initialize registry with strategies
 * const registry = new AnalyticsStrategyRegistry([
 *   new PollAnalyticsStrategy(analyticsRepository),
 *   new QuizAnalyticsStrategy(analyticsRepository),
 *   new GenericAnalyticsStrategy(analyticsRepository)
 * ]);
 *
 * // Get strategy for category
 * const strategy = registry.getStrategy('polls');
 * const metrics = await strategy.buildMetrics(formId, tenantId);
 * ```
 */
export class AnalyticsStrategyRegistry {
  /**
   * Map of registered strategies indexed by category.
   * Populated during construction from strategy array.
   */
  private strategies: Map<string, IAnalyticsStrategy> = new Map();

  /**
   * Fallback strategy for unknown/unsupported categories.
   * Provides generic analytics (counts, timestamps) when category metadata is missing.
   */
  private fallbackStrategy: IAnalyticsStrategy | null = null;

  /**
   * Creates a new analytics strategy registry.
   *
   * Validates that:
   * - At least one strategy is provided
   * - No two strategies claim the same category
   * - Exactly one strategy is designated as fallback (supports empty string)
   *
   * @param strategies - Array of analytics strategy instances
   * @throws {Error} When validation fails (duplicate categories, missing fallback, empty array)
   *
   * @example
   * ```typescript
   * const registry = new AnalyticsStrategyRegistry([
   *   new GenericAnalyticsStrategy(analyticsRepository), // Fallback
   *   new PollAnalyticsStrategy(analyticsRepository),
   *   new QuizAnalyticsStrategy(analyticsRepository)
   * ]);
   * ```
   */
  constructor(strategies: IAnalyticsStrategy[]) {
    if (!strategies || strategies.length === 0) {
      throw new Error('AnalyticsStrategyRegistry requires at least one strategy (generic fallback)');
    }

    // Register strategies and detect fallback
    for (const strategy of strategies) {
      // Check if strategy is fallback (supports null category)
      if (strategy.supports(null)) {
        if (this.fallbackStrategy !== null) {
          throw new Error('Only one fallback strategy allowed (multiple strategies support null category)');
        }
        this.fallbackStrategy = strategy;
      }

      // Detect all categories this strategy supports
      const categories = this.detectSupportedCategories(strategy);
      for (const category of categories) {
        if (this.strategies.has(category)) {
          throw new Error(
            `Duplicate strategy registration for category "${category}"`
          );
        }
        this.strategies.set(category, strategy);
      }
    }

    if (this.fallbackStrategy === null) {
      throw new Error('No fallback strategy found (must support null category)');
    }
  }

  /**
   * Detects which categories a strategy supports.
   *
   * Tests the strategy against known template categories to build a map.
   * Used during registry construction to populate the strategies map.
   *
   * @param strategy - Analytics strategy to test
   * @returns Array of category values the strategy supports
   *
   * @private
   */
  private detectSupportedCategories(strategy: IAnalyticsStrategy): string[] {
    const knownCategories: (TemplateCategory | null)[] = [
      TemplateCategory.POLLS,
      TemplateCategory.QUIZ,
      TemplateCategory.ECOMMERCE,
      TemplateCategory.SERVICES,
      TemplateCategory.DATA_COLLECTION,
      TemplateCategory.EVENTS,
      null, // Null for fallback
    ];

    return knownCategories
      .filter((category) => strategy.supports(category))
      .map((category) => category || ''); // Convert null to empty string for map key
  }

  /**
   * Retrieves the appropriate analytics strategy for a template category.
   *
   * Selection logic:
   * 1. If category is provided and has registered strategy, return it
   * 2. If category is unknown, log warning and return fallback
   * 3. If category is null/undefined, return fallback
   *
   * @param category - Template category from TemplateCategory enum (null for generic analytics)
   * @returns Analytics strategy instance (never null - fallback guaranteed)
   *
   * @example
   * ```typescript
   * const strategy = registry.getStrategy(TemplateCategory.POLLS); // Returns PollAnalyticsStrategy
   * const fallback = registry.getStrategy(null); // Returns GenericAnalyticsStrategy
   * const unknown = registry.getStrategy('invalid' as any); // Returns GenericAnalyticsStrategy + logs warning
   * ```
   */
  getStrategy(category: TemplateCategory | null | undefined): IAnalyticsStrategy {
    // Handle null/undefined category (use fallback)
    if (!category) {
      return this.fallbackStrategy!; // Non-null assertion safe (validated in constructor)
    }

    // Use category value directly (already lowercase from enum)
    const categoryKey = category;

    // Check if strategy is registered for this category
    const strategy = this.strategies.get(categoryKey);

    if (strategy) {
      return strategy;
    }

    // Unknown category - log warning and use fallback
    console.warn(
      `[AnalyticsStrategyRegistry] No strategy found for category "${category}", using generic fallback`
    );

    return this.fallbackStrategy!; // Non-null assertion safe (validated in constructor)
  }

  /**
   * Builds analytics metrics for a form using the appropriate strategy.
   *
   * Convenience method that combines strategy selection and metrics computation.
   * Handles errors from strategy execution and returns them to caller.
   *
   * @param formId - UUID of the form to analyze
   * @param category - Template category from TemplateCategory enum (null for generic analytics)
   * @param tenantId - Optional tenant ID for multi-tenant filtering
   * @returns Promise containing category-specific metrics
   * @throws {Error} When strategy execution fails (database errors, invalid formId)
   *
   * @example
   * ```typescript
   * const metrics = await registry.buildMetrics(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   TemplateCategory.POLLS,
   *   'tenant-abc'
   * );
   * ```
   */
  async buildMetrics(
    formId: string,
    category: TemplateCategory | null | undefined,
    tenantId: string | null
  ): Promise<CategoryMetrics> {
    const strategy = this.getStrategy(category);
    return strategy.buildMetrics(formId, tenantId);
  }

  /**
   * Checks if a strategy is registered for a given category.
   *
   * @param category - Template category from TemplateCategory enum
   * @returns True if a specific strategy exists (false if fallback would be used)
   *
   * @example
   * ```typescript
   * registry.hasStrategy(TemplateCategory.POLLS); // true
   * registry.hasStrategy('invalid' as any); // false
   * registry.hasStrategy(null); // false
   * ```
   */
  hasStrategy(category: TemplateCategory | null | undefined): boolean {
    if (!category) {
      return false;
    }
    return this.strategies.has(category);
  }

  /**
   * Lists all registered categories (excluding fallback).
   *
   * Useful for debugging, documentation, and API discovery.
   *
   * @returns Array of category strings with registered strategies
   *
   * @example
   * ```typescript
   * const categories = registry.getRegisteredCategories();
   * // ['polls', 'quiz', 'ecommerce', 'services', 'data_collection', 'events']
   * ```
   */
  getRegisteredCategories(): string[] {
    return Array.from(this.strategies.keys()).filter(
      (category) => category !== ''
    );
  }
}
