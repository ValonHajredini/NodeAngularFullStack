/**
 * Analytics Strategy Registry
 *
 * Central registry for managing category-specific analytics strategies.
 * Implements strategy pattern with automatic strategy selection.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { TemplateCategory } from '@nodeangularfullstack/shared';
import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { GenericAnalyticsStrategy } from './generic-analytics.strategy';
import { QuizAnalyticsStrategy } from './quiz-analytics.strategy';
import { FormSchemasRepository } from '../../repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../../repositories/form-submissions.repository';

/**
 * Registry service for analytics strategies.
 * Manages strategy instances and provides strategy selection logic.
 */
export class AnalyticsStrategyRegistry {
  private strategies: Map<TemplateCategory | null, IAnalyticsStrategy>;

  constructor(
    private readonly schemasRepository: FormSchemasRepository,
    private readonly submissionsRepository: FormSubmissionsRepository
  ) {
    this.strategies = new Map();
    this.registerStrategies();
  }

  /**
   * Register all available analytics strategies
   */
  private registerStrategies(): void {
    // Generic strategy (fallback)
    this.strategies.set(
      null,
      new GenericAnalyticsStrategy(this.submissionsRepository)
    );

    // Quiz strategy
    this.strategies.set(
      TemplateCategory.QUIZ,
      new QuizAnalyticsStrategy(
        this.schemasRepository,
        this.submissionsRepository
      )
    );

    // TODO: Register other strategies (Story 30.4)
    // this.strategies.set(TemplateCategory.POLLS, new PollAnalyticsStrategy(...));
    // this.strategies.set(TemplateCategory.ECOMMERCE, new ProductAnalyticsStrategy(...));
    // this.strategies.set(TemplateCategory.SERVICES, new AppointmentAnalyticsStrategy(...));
    // this.strategies.set(TemplateCategory.DATA_COLLECTION, new RestaurantAnalyticsStrategy(...));
  }

  /**
   * Get analytics strategy for a specific category
   *
   * @param category - Template category
   * @returns Analytics strategy instance
   */
  getStrategy(category: TemplateCategory | null): IAnalyticsStrategy {
    const strategy = this.strategies.get(category);

    if (!strategy) {
      // Fallback to generic strategy if category strategy not found
      console.warn(
        `No strategy found for category: ${category}, using generic strategy`
      );
      return this.strategies.get(null)!;
    }

    return strategy;
  }

  /**
   * Get all registered strategies
   *
   * @returns Map of category to strategy
   */
  getAllStrategies(): Map<TemplateCategory | null, IAnalyticsStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Check if a strategy exists for a category
   *
   * @param category - Template category
   * @returns True if strategy registered
   */
  hasStrategy(category: TemplateCategory | null): boolean {
    return this.strategies.has(category);
  }
}
