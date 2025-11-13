/**
 * Analytics Service
 *
 * High-level service for form analytics operations.
 * Uses the strategy registry to delegate category-specific analytics computation.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { AnalyticsStrategyRegistry } from './strategy-registry.service';
import { GenericAnalyticsStrategy } from './strategies/generic-analytics.strategy';
import { analyticsRepository } from '../../repositories/analytics.repository';
import { CategoryMetrics, TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Analytics service for computing form metrics.
 *
 * Responsibilities:
 * - Provides high-level API for analytics operations
 * - Delegates to strategy registry for category-specific logic
 * - Handles errors and logging
 * - Enforces tenant isolation
 *
 * This is the primary integration point for controllers and other services
 * that need form analytics.
 *
 * @example
 * ```typescript
 * // Get analytics for a form
 * const metrics = await analyticsService.getFormAnalytics(
 *   '123e4567-e89b-12d3-a456-426614174000',
 *   'polls',
 *   'tenant-abc'
 * );
 * ```
 */
export class AnalyticsService {
  /**
   * Strategy registry for selecting appropriate analytics strategies.
   * Initialized with generic fallback strategy.
   */
  private registry: AnalyticsStrategyRegistry;

  /**
   * Creates a new analytics service.
   *
   * Initializes the strategy registry with:
   * - GenericAnalyticsStrategy (fallback)
   * - Additional strategies will be registered in future stories (30.3-30.5)
   *
   * @example
   * ```typescript
   * const service = new AnalyticsService();
   * ```
   */
  constructor() {
    // Initialize registry with generic strategy (fallback)
    // Future stories (30.3-30.5) will add category-specific strategies
    this.registry = new AnalyticsStrategyRegistry([
      new GenericAnalyticsStrategy(analyticsRepository),
    ]);
  }

  /**
   * Gets analytics metrics for a form.
   *
   * Workflow:
   * 1. Select appropriate strategy based on category (via registry)
   * 2. Delegate metrics computation to strategy
   * 3. Return typed CategoryMetrics result
   *
   * The category parameter determines which strategy is used:
   * - POLLS → PollAnalyticsStrategy (when implemented in Story 30.3)
   * - QUIZ → QuizAnalyticsStrategy (when implemented in Story 30.3)
   * - DATA_COLLECTION or null → GenericAnalyticsStrategy (current fallback)
   *
   * @param formId - UUID of the form to analyze
   * @param category - Template category from TemplateCategory enum (null for generic analytics)
   * @param tenantId - Optional tenant ID for multi-tenant filtering (null for non-tenant mode)
   * @returns Promise containing category-specific analytics metrics
   * @throws {Error} When formId is invalid or database query fails
   *
   * @example
   * ```typescript
   * // Get poll analytics (when poll strategy is implemented)
   * const pollMetrics = await analyticsService.getFormAnalytics(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   TemplateCategory.POLLS,
   *   'tenant-abc'
   * );
   * // Returns PollMetrics with vote counts and percentages
   *
   * // Get generic analytics (current implementation)
   * const genericMetrics = await analyticsService.getFormAnalytics(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   null,
   *   'tenant-abc'
   * );
   * // Returns RestaurantMetrics (data_collection) with basic counts
   * ```
   */
  async getFormAnalytics(
    formId: string,
    category: TemplateCategory | null | undefined,
    tenantId: string | null
  ): Promise<CategoryMetrics> {
    try {
      // Validate formId (basic UUID format check)
      if (!formId || !this.isValidUUID(formId)) {
        throw new Error('Invalid form ID format');
      }

      // Delegate to registry (which selects appropriate strategy)
      return await this.registry.buildMetrics(formId, category, tenantId);
    } catch (error: any) {
      console.error(
        `[AnalyticsService] Error getting analytics for form ${formId}:`,
        error
      );
      throw new Error(`Failed to get form analytics: ${error.message}`);
    }
  }

  /**
   * Checks if a category has a specialized analytics strategy.
   *
   * Useful for API endpoints to determine available analytics capabilities.
   *
   * @param category - Template category from TemplateCategory enum
   * @returns True if a specialized strategy exists (false if fallback would be used)
   *
   * @example
   * ```typescript
   * if (analyticsService.hasSpecializedStrategy(TemplateCategory.POLLS)) {
   *   // Show advanced poll analytics UI
   * } else {
   *   // Show generic analytics UI
   * }
   * ```
   */
  hasSpecializedStrategy(category: TemplateCategory | null | undefined): boolean {
    return this.registry.hasStrategy(category);
  }

  /**
   * Lists all categories with specialized analytics strategies.
   *
   * Useful for API documentation and frontend capability discovery.
   *
   * @returns Array of category strings with registered strategies
   *
   * @example
   * ```typescript
   * const categories = analyticsService.getSupportedCategories();
   * // Current: [] (only generic fallback)
   * // After Story 30.3: ['polls', 'quiz']
   * // After Story 30.4: ['polls', 'quiz', 'ecommerce', 'services', 'data_collection']
   * ```
   */
  getSupportedCategories(): string[] {
    return this.registry.getRegisteredCategories();
  }

  /**
   * Validates UUID format.
   *
   * @param uuid - String to validate
   * @returns True if valid UUID v4 format
   * @private
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * Singleton instance for use across the application.
 * Controllers and other services should import this instance.
 */
export const analyticsService = new AnalyticsService();
