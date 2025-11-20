/**
 * Poll Analytics Strategy
 *
 * Computes poll-specific analytics: vote counts, percentages, and participation metrics.
 * Implements the IAnalyticsStrategy interface for Poll template category.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 *
 * @since 2025-01-27
 */

import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { PollMetrics, TemplateCategory } from '@nodeangularfullstack/shared';
import { AnalyticsRepository } from '../../../repositories/analytics.repository';

/**
 * Poll-specific analytics strategy.
 *
 * Computes:
 * - Vote counts per option (absolute numbers)
 * - Vote percentages (normalized to 100%)
 * - Unique voters count
 * - Most popular option
 * - Submission timestamps
 *
 * Handles edge cases:
 * - Zero votes (returns zeroed metrics with empty vote counts)
 * - Missing poll_option field (returns empty metrics)
 * - Invalid data (filters and logs)
 *
 * Query performance:
 * - Uses repository JSONB helpers for optimized aggregation
 * - Targets <300ms response time via indexed queries
 * - Single database roundtrip for vote counts + submission counts
 *
 * **Poll Field Standardization (Story 30.7, QA Review VAL-001)**:
 * Poll forms should use 'poll_option' as the standard field name for vote options.
 * This ensures consistent analytics aggregation across all poll forms. Custom field
 * names are supported via constructor parameter for legacy forms or special use cases.
 *
 * @example
 * ```typescript
 * const strategy = new PollAnalyticsStrategy(analyticsRepository);
 * const metrics = await strategy.buildMetrics(pollFormId, tenantId);
 * // {
 * //   category: 'polls',
 * //   totalSubmissions: 150,
 * //   voteCounts: { option_a: 75, option_b: 45, option_c: 30 },
 * //   votePercentages: { option_a: 50, option_b: 30, option_c: 20 },
 * //   uniqueVoters: 150,
 * //   mostPopularOption: 'option_a',
 * //   firstSubmissionAt: '2025-01-01T00:00:00Z',
 * //   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * // }
 * ```
 */
export class PollAnalyticsStrategy implements IAnalyticsStrategy {
  /**
   * Default field key for poll option in JSONB submissions.
   * Standard: 'poll_option' - All poll template forms should use this field name.
   * Can be overridden in constructor for legacy forms with custom field names.
   *
   * @see Constructor parameter `pollFieldKey` for custom field name support
   */
  private readonly pollFieldKey: string;

  /**
   * Analytics repository for querying submission data.
   * Injected via constructor for testability.
   */
  private repository: AnalyticsRepository;

  /**
   * Creates a new poll analytics strategy.
   *
   * @param repository - Analytics repository instance
   * @param pollFieldKey - JSONB field key for poll option (default: 'poll_option')
   *
   * @example
   * ```typescript
   * const strategy = new PollAnalyticsStrategy(analyticsRepository);
   * // or with custom field key
   * const customStrategy = new PollAnalyticsStrategy(analyticsRepository, 'vote_choice');
   * ```
   */
  constructor(repository: AnalyticsRepository, pollFieldKey: string = 'poll_option') {
    this.repository = repository;
    this.pollFieldKey = pollFieldKey;
  }

  /**
   * Determines if this strategy supports the given category.
   *
   * Supports:
   * - TemplateCategory.POLLS ('polls')
   *
   * @param category - Template category from TemplateCategory enum
   * @returns True if category is POLLS
   *
   * @example
   * ```typescript
   * strategy.supports(TemplateCategory.POLLS); // true
   * strategy.supports(TemplateCategory.QUIZ); // false
   * strategy.supports(null); // false
   * ```
   */
  supports(category: TemplateCategory | null): boolean {
    return category === TemplateCategory.POLLS;
  }

  /**
   * Detects if the form has the required poll field.
   *
   * Checks a sample submission for the presence of the poll option field.
   *
   * @param formId - UUID of the form schema to check
   * @param tenantId - Optional tenant ID for isolation
   * @returns Object with detection results and missing field information
   * @private
   */
  private async detectRequiredFields(
    formId: string,
    tenantId: string | null
  ): Promise<{ hasRequiredFields: boolean; missing: string[] }> {
    const submissions = await this.repository.getAllSubmissionValues(formId, tenantId);

    if (submissions.length === 0) {
      return { hasRequiredFields: false, missing: [] };
    }

    // Check first submission for poll field
    const sampleSubmission = submissions[0];
    const missing: string[] = [];

    if (!(this.pollFieldKey in sampleSubmission) || sampleSubmission[this.pollFieldKey] === null || sampleSubmission[this.pollFieldKey] === undefined) {
      missing.push(this.pollFieldKey);
    }

    return {
      hasRequiredFields: missing.length === 0,
      missing
    };
  }

  /**
   * Builds poll analytics metrics for a form.
   *
   * Process:
   * 1. Fetch submission counts and time range (via repository)
   * 2. Detect if form has required poll field
   * 3. If missing field, return empty metrics with helpful message
   * 4. Fetch vote counts per option (via repository JSONB aggregation)
   * 5. Calculate vote percentages (normalized to 100%)
   * 6. Identify most popular option (highest vote count)
   * 7. Return strongly-typed PollMetrics
   *
   * Edge cases:
   * - No submissions: Returns zeroed metrics with empty voteCounts/votePercentages
   * - Invalid votes: Filtered out by repository (JSONB key validation)
   * - Ties for most popular: Returns first option alphabetically
   *
   * Performance:
   * - 2 database queries (counts + vote aggregation)
   * - JSONB GIN indexes optimize vote counting
   * - Expected response time: <300ms for 10,000+ submissions
   *
   * @param formId - UUID of the poll form to analyze
   * @param tenantId - Optional tenant ID for multi-tenant filtering
   * @returns Promise containing poll-specific metrics
   * @throws {Error} When database query fails or formId is invalid
   *
   * @example
   * ```typescript
   * const metrics = await strategy.buildMetrics(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'tenant-abc'
   * );
   * ```
   */
  async buildMetrics(formId: string, tenantId: string | null): Promise<PollMetrics> {
    try {
      // Fetch basic submission counts and time range
      const counts = await this.repository.getSubmissionCounts(formId, tenantId);

      // Handle zero submissions case
      if (counts.totalSubmissions === 0) {
        return {
          category: 'polls',
          totalSubmissions: 0,
          voteCounts: {},
          votePercentages: {},
          uniqueVoters: 0,
          mostPopularOption: '',
          firstSubmissionAt: undefined,
          lastSubmissionAt: undefined,
        };
      }

      // Detect if form has required poll field
      const fieldDetection = await this.detectRequiredFields(formId, tenantId);

      // If form doesn't have poll field, return empty metrics with helpful message
      if (!fieldDetection.hasRequiredFields) {
        return {
          category: 'polls',
          totalSubmissions: counts.totalSubmissions,
          voteCounts: {},
          votePercentages: {},
          uniqueVoters: 0,
          mostPopularOption: '',
          firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
          lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
          missingFields: {
            hasRequiredFields: false,
            missing: fieldDetection.missing,
            message: `This form does not contain a poll option field (${fieldDetection.missing.join(', ')}). Poll analytics require forms with a ${this.pollFieldKey} field containing the selected option. Consider using a different template category for this type of data collection.`
          }
        };
      }

      // Fetch vote counts per option
      const optionCounts = await this.repository.getPollOptionCounts(
        formId,
        this.pollFieldKey,
        tenantId
      );

      // Build voteCounts record
      const voteCounts: Record<string, number> = {};
      optionCounts.forEach((item) => {
        voteCounts[item.option] = item.count;
      });

      // Calculate total votes (sum of all option counts)
      const totalVotes = optionCounts.reduce((sum, item) => sum + item.count, 0);

      // Calculate vote percentages (normalized to 100%)
      const votePercentages: Record<string, number> = {};
      optionCounts.forEach((item) => {
        votePercentages[item.option] =
          totalVotes > 0 ? Math.round((item.count / totalVotes) * 100 * 100) / 100 : 0;
      });

      // Identify most popular option (highest vote count)
      const mostPopularOption =
        optionCounts.length > 0
          ? optionCounts.reduce((max, item) => (item.count > max.count ? item : max), optionCounts[0])
              .option
          : '';

      // Return strongly-typed PollMetrics
      const metrics: PollMetrics = {
        category: 'polls',
        totalSubmissions: counts.totalSubmissions,
        voteCounts,
        votePercentages,
        uniqueVoters: counts.totalSubmissions, // Each submission = 1 unique voter (duplicate prevention handled at submission level)
        mostPopularOption,
        firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
        lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
      };

      return metrics;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[PollAnalyticsStrategy] Error building metrics for form ${formId}:`,
        error
      );
      throw new Error(`Failed to build poll analytics: ${errorMessage}`);
    }
  }
}
