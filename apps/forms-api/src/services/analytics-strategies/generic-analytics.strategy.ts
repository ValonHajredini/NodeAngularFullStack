/**
 * Generic Analytics Strategy
 *
 * Fallback strategy for forms without category-specific analytics.
 * Returns basic metrics suitable for any form type.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { CategoryMetrics, GenericMetrics } from '@nodeangularfullstack/shared';
import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { FormSubmissionsRepository } from '../../repositories/form-submissions.repository';

/**
 * Generic analytics strategy for forms without specialized category metrics.
 * Provides basic submission count and timestamp data.
 */
export class GenericAnalyticsStrategy implements IAnalyticsStrategy {
  readonly category = null;

  constructor(
    private readonly submissionsRepository: FormSubmissionsRepository
  ) {}

  /**
   * Calculate generic metrics (submission count, dates)
   *
   * @param formSchemaId - Form schema UUID
   * @returns Generic metrics object
   */
  async calculateMetrics(formSchemaId: string): Promise<CategoryMetrics> {
    // Get total submission count
    const totalSubmissions = await this.submissionsRepository.countByFormSchema(
      formSchemaId
    );

    if (totalSubmissions === 0) {
      throw new Error('No submissions available for analytics');
    }

    // Get first and last submission dates
    const submissions = await this.submissionsRepository.findByFormSchema(
      formSchemaId,
      { limit: 1, offset: 0, sortBy: 'submitted_at', sortOrder: 'asc' }
    );
    const lastSubmissions = await this.submissionsRepository.findByFormSchema(
      formSchemaId,
      { limit: 1, offset: 0, sortBy: 'submitted_at', sortOrder: 'desc' }
    );

    const firstSubmissionDate =
      submissions.length > 0
        ? submissions[0].submittedAt.toISOString()
        : new Date().toISOString();
    const lastSubmissionDate =
      lastSubmissions.length > 0
        ? lastSubmissions[0].submittedAt.toISOString()
        : new Date().toISOString();

    const metrics: GenericMetrics = {
      category: null,
      totalSubmissions,
      firstSubmissionDate,
      lastSubmissionDate,
    };

    return metrics;
  }
}
