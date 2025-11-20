/**
 * Category Analytics Service
 *
 * Orchestrates category-specific analytics calculation using strategy pattern.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import {
  CategoryMetrics,
  TemplateCategory,
  detectTemplateCategory,
} from '@nodeangularfullstack/shared';
import { AnalyticsStrategyRegistry } from './analytics-strategies/analytics-strategy-registry';
import { FormSchemasRepository } from '../repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../repositories/form-submissions.repository';

/**
 * Service for calculating category-specific analytics metrics
 */
export class CategoryAnalyticsService {
  private readonly strategyRegistry: AnalyticsStrategyRegistry;

  constructor(
    private readonly schemasRepository: FormSchemasRepository,
    private readonly submissionsRepository: FormSubmissionsRepository
  ) {
    this.strategyRegistry = new AnalyticsStrategyRegistry(
      schemasRepository,
      submissionsRepository
    );
  }

  /**
   * Calculate category-specific metrics for a form
   *
   * @param formSchemaId - Form schema UUID
   * @returns Category-specific metrics
   * @throws {Error} If form not found or no submissions
   */
  async getCategoryMetrics(formSchemaId: string): Promise<CategoryMetrics> {
    // Get form schema to detect category
    const schema = await this.schemasRepository.findById(formSchemaId);
    if (!schema) {
      throw new Error('Form schema not found');
    }

    // Detect template category from schema
    const category = detectTemplateCategory(schema.schemaJson);

    // Get appropriate strategy
    const strategy = this.strategyRegistry.getStrategy(category);

    // Calculate metrics using strategy
    const metrics = await strategy.calculateMetrics(formSchemaId);

    return metrics;
  }

  /**
   * Check if category-specific analytics are available for a form
   *
   * @param formSchemaId - Form schema UUID
   * @returns True if category analytics available
   */
  async hasCategoryAnalytics(formSchemaId: string): Promise<boolean> {
    try {
      const schema = await this.schemasRepository.findById(formSchemaId);
      if (!schema) {
        return false;
      }

      const category = detectTemplateCategory(schema.schemaJson);
      return this.strategyRegistry.hasStrategy(category);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detected category for a form
   *
   * @param formSchemaId - Form schema UUID
   * @returns Template category or null
   */
  async getFormCategory(
    formSchemaId: string
  ): Promise<TemplateCategory | null> {
    const schema = await this.schemasRepository.findById(formSchemaId);
    if (!schema) {
      return null;
    }

    return detectTemplateCategory(schema.schemaJson);
  }
}
