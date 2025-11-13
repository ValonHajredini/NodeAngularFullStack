/**
 * Quiz Analytics Strategy
 *
 * Computes quiz-specific analytics: score distributions, pass/fail rates, and question performance.
 * Implements the IAnalyticsStrategy interface for Quiz template category.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 *
 * @since 2025-01-27
 */

import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { QuizMetrics, TemplateCategory } from '@nodeangularfullstack/shared';
import { AnalyticsRepository } from '../../../repositories/analytics.repository';

/**
 * Quiz-specific analytics strategy.
 *
 * Computes:
 * - Score distribution histogram (0-20, 21-40, 41-60, 61-80, 81-100)
 * - Average and median scores
 * - Pass rate (default threshold: 60%)
 * - Question accuracy per question
 * - Highest/lowest scores
 * - Submission timestamps
 *
 * Handles edge cases:
 * - Zero submissions (returns zeroed metrics)
 * - Missing/invalid scores (filters out, logs warning)
 * - Malformed question responses (skips in accuracy calculation)
 *
 * Query performance:
 * - Uses repository JSONB helpers for histogram buckets
 * - Fetches raw submission values for statistical calculations
 * - Targets <300ms response time via indexed queries
 *
 * @example
 * ```typescript
 * const strategy = new QuizAnalyticsStrategy(analyticsRepository);
 * const metrics = await strategy.buildMetrics(quizFormId, tenantId);
 * // {
 * //   category: 'quiz',
 * //   totalSubmissions: 200,
 * //   averageScore: 75.5,
 * //   medianScore: 80,
 * //   passRate: 68.5,
 * //   scoreDistribution: { '0-20': 10, '21-40': 15, '41-60': 25, '61-80': 80, '81-100': 70 },
 * //   questionAccuracy: { q1: 85.5, q2: 62.0, q3: 91.5 },
 * //   highestScore: 100,
 * //   lowestScore: 15
 * // }
 * ```
 */
export class QuizAnalyticsStrategy implements IAnalyticsStrategy {
  /**
   * Default field key for quiz score in JSONB submissions.
   * Can be overridden in constructor for custom quiz forms.
   */
  private readonly scoreFieldKey: string;

  /**
   * Default passing score threshold (0-100 scale).
   * Can be overridden in constructor for custom quiz forms.
   */
  private readonly passingThreshold: number;

  /**
   * Analytics repository for querying submission data.
   * Injected via constructor for testability.
   */
  private repository: AnalyticsRepository;

  /**
   * Creates a new quiz analytics strategy.
   *
   * @param repository - Analytics repository instance
   * @param scoreFieldKey - JSONB field key for quiz score (default: 'score')
   * @param passingThreshold - Minimum score to pass (default: 60)
   *
   * @example
   * ```typescript
   * const strategy = new QuizAnalyticsStrategy(analyticsRepository);
   * // or with custom field key and threshold
   * const customStrategy = new QuizAnalyticsStrategy(analyticsRepository, 'quiz_score', 70);
   * ```
   */
  constructor(
    repository: AnalyticsRepository,
    scoreFieldKey: string = 'score',
    passingThreshold: number = 60
  ) {
    this.repository = repository;
    this.scoreFieldKey = scoreFieldKey;
    this.passingThreshold = passingThreshold;
  }

  /**
   * Determines if this strategy supports the given category.
   *
   * Supports:
   * - TemplateCategory.QUIZ ('quiz')
   *
   * @param category - Template category from TemplateCategory enum
   * @returns True if category is QUIZ
   *
   * @example
   * ```typescript
   * strategy.supports(TemplateCategory.QUIZ); // true
   * strategy.supports(TemplateCategory.POLLS); // false
   * strategy.supports(null); // false
   * ```
   */
  supports(category: TemplateCategory | null): boolean {
    return category === TemplateCategory.QUIZ;
  }

  /**
   * Builds quiz analytics metrics for a form.
   *
   * Process:
   * 1. Fetch submission counts and time range (via repository)
   * 2. Fetch score distribution buckets (via repository JSONB aggregation)
   * 3. Fetch all submission values for statistical calculations
   * 4. Calculate average/median scores
   * 5. Calculate pass rate (submissions >= passing threshold)
   * 6. Calculate question accuracy (correct answers / total attempts per question)
   * 7. Identify highest/lowest scores
   * 8. Return strongly-typed QuizMetrics
   *
   * Edge cases:
   * - No submissions: Returns zeroed metrics with empty scoreDistribution/questionAccuracy
   * - Invalid scores: Filtered out, logged as warning
   * - Missing question data: Question excluded from accuracy calculation
   *
   * Performance:
   * - 3 database queries (counts + buckets + raw values)
   * - JSONB GIN indexes optimize score aggregation
   * - Expected response time: <300ms for 10,000+ submissions
   *
   * @param formId - UUID of the quiz form to analyze
   * @param tenantId - Optional tenant ID for multi-tenant filtering
   * @returns Promise containing quiz-specific metrics
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
  async buildMetrics(formId: string, tenantId: string | null): Promise<QuizMetrics> {
    try {
      // Fetch basic submission counts and time range
      const counts = await this.repository.getSubmissionCounts(formId, tenantId);

      // Handle zero submissions case
      if (counts.totalSubmissions === 0) {
        return {
          category: 'quiz',
          totalSubmissions: 0,
          averageScore: 0,
          medianScore: 0,
          passRate: 0,
          scoreDistribution: {},
          questionAccuracy: {},
          highestScore: 0,
          lowestScore: 0,
          firstSubmissionAt: undefined,
          lastSubmissionAt: undefined,
        };
      }

      // Fetch score distribution buckets
      const scoreBuckets = await this.repository.getQuizScoreBuckets(
        formId,
        this.scoreFieldKey,
        tenantId
      );

      // Build scoreDistribution record
      const scoreDistribution: Record<string, number> = {};
      scoreBuckets.forEach((bucket) => {
        scoreDistribution[bucket.bucket] = bucket.count;
      });

      // Fetch all submission values for statistical calculations
      const submissions = await this.repository.getAllSubmissionValues(formId, tenantId);

      // Extract scores and filter valid numeric values
      const scores: number[] = [];
      submissions.forEach((submission) => {
        const scoreValue = submission[this.scoreFieldKey];
        if (typeof scoreValue === 'number' && !isNaN(scoreValue)) {
          scores.push(scoreValue);
        } else if (typeof scoreValue === 'string') {
          const parsed = parseFloat(scoreValue);
          if (!isNaN(parsed)) {
            scores.push(parsed);
          }
        }
      });

      // Handle case where no valid scores exist
      if (scores.length === 0) {
        console.warn(
          `[QuizAnalyticsStrategy] No valid scores found for form ${formId} (${submissions.length} submissions)`
        );
        return {
          category: 'quiz',
          totalSubmissions: counts.totalSubmissions,
          averageScore: 0,
          medianScore: 0,
          passRate: 0,
          scoreDistribution,
          questionAccuracy: {},
          highestScore: 0,
          lowestScore: 0,
          firstSubmissionAt: counts.firstSubmissionAt || undefined,
          lastSubmissionAt: counts.lastSubmissionAt || undefined,
        };
      }

      // Calculate average score
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // Calculate median score
      const sortedScores = [...scores].sort((a, b) => a - b);
      const medianScore =
        sortedScores.length % 2 === 0
          ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
          : sortedScores[Math.floor(sortedScores.length / 2)];

      // Calculate pass rate (percentage of scores >= passing threshold)
      const passingCount = scores.filter((score) => score >= this.passingThreshold).length;
      const passRate = (passingCount / scores.length) * 100;

      // Identify highest and lowest scores
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);

      // Calculate question accuracy
      const questionAccuracy = this.calculateQuestionAccuracy(submissions);

      // Return strongly-typed QuizMetrics
      const metrics: QuizMetrics = {
        category: 'quiz',
        totalSubmissions: counts.totalSubmissions,
        averageScore: Math.round(averageScore * 100) / 100,
        medianScore: Math.round(medianScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        scoreDistribution,
        questionAccuracy,
        highestScore,
        lowestScore,
        firstSubmissionAt: counts.firstSubmissionAt || undefined,
        lastSubmissionAt: counts.lastSubmissionAt || undefined,
      };

      return metrics;
    } catch (error: any) {
      console.error(
        `[QuizAnalyticsStrategy] Error building metrics for form ${formId}:`,
        error
      );
      throw new Error(`Failed to build quiz analytics: ${error.message}`);
    }
  }

  /**
   * Calculates accuracy percentage per question.
   *
   * Analyzes submission values to extract question responses and calculate
   * the percentage of correct answers for each question.
   *
   * Expected JSONB structure:
   * - Question keys: 'q1', 'q2', 'q3', etc. or 'question_1', 'question_2', etc.
   * - Question values: boolean (true = correct, false = incorrect) or number (1/0)
   *
   * Filters out:
   * - Non-question keys (score, metadata, timestamps, etc.)
   * - Invalid values (non-boolean, non-numeric)
   * - Missing questions (not present in all submissions)
   *
   * @param submissions - Array of JSONB submission values
   * @returns Record of question ID to accuracy percentage (0-100)
   *
   * @example
   * ```typescript
   * const accuracy = this.calculateQuestionAccuracy([
   *   { q1: true, q2: false, q3: true, score: 75 },
   *   { q1: true, q2: true, q3: false, score: 80 }
   * ]);
   * // { q1: 100, q2: 50, q3: 50 }
   * ```
   */
  private calculateQuestionAccuracy(
    submissions: Record<string, any>[]
  ): Record<string, number> {
    const questionAccuracy: Record<string, number> = {};

    // Return empty if no submissions
    if (submissions.length === 0) {
      return questionAccuracy;
    }

    // Identify question keys (keys that start with 'q' or 'question')
    // and exclude common non-question keys
    const excludedKeys = new Set([
      this.scoreFieldKey,
      'score',
      'submitted_at',
      'user_id',
      'metadata',
      'timestamp',
    ]);

    const questionKeys = new Set<string>();
    submissions.forEach((submission) => {
      Object.keys(submission).forEach((key) => {
        if (
          !excludedKeys.has(key) &&
          (key.startsWith('q') || key.toLowerCase().includes('question'))
        ) {
          questionKeys.add(key);
        }
      });
    });

    // Calculate accuracy for each question
    questionKeys.forEach((questionKey) => {
      let correctCount = 0;
      let totalAttempts = 0;

      submissions.forEach((submission) => {
        const answer = submission[questionKey];

        // Handle different answer formats
        if (typeof answer === 'boolean') {
          totalAttempts++;
          if (answer === true) {
            correctCount++;
          }
        } else if (typeof answer === 'number') {
          totalAttempts++;
          if (answer === 1) {
            correctCount++;
          }
        } else if (typeof answer === 'string') {
          // Handle string values: 'true', '1', 'correct', etc.
          const normalized = answer.toLowerCase().trim();
          if (['true', '1', 'correct', 'yes'].includes(normalized)) {
            totalAttempts++;
            correctCount++;
          } else if (['false', '0', 'incorrect', 'no'].includes(normalized)) {
            totalAttempts++;
          }
        }
      });

      // Calculate accuracy percentage
      if (totalAttempts > 0) {
        questionAccuracy[questionKey] = Math.round((correctCount / totalAttempts) * 100 * 100) / 100;
      }
    });

    return questionAccuracy;
  }
}
