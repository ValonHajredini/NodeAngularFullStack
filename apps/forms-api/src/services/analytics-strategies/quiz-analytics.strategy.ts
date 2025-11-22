/**
 * Quiz Analytics Strategy
 *
 * Calculates quiz-specific metrics: score distribution, pass/fail rate,
 * average score, question accuracy.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 *
 * @since 2025-01-27
 */

import {
  CategoryMetrics,
  QuizMetrics,
  TemplateCategory,
  QuizConfig,
} from '@nodeangularfullstack/shared';
import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { FormSchemasRepository } from '../../repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../../repositories/form-submissions.repository';

/**
 * Quiz analytics strategy for calculating scores, pass rates, and accuracy.
 */
export class QuizAnalyticsStrategy implements IAnalyticsStrategy {
  readonly category = TemplateCategory.QUIZ;

  constructor(
    private readonly schemasRepository: FormSchemasRepository,
    private readonly submissionsRepository: FormSubmissionsRepository
  ) {}

  /**
   * Calculate quiz-specific metrics
   *
   * @param formSchemaId - Form schema UUID
   * @returns Quiz metrics with scores, pass rate, distribution
   */
  async calculateMetrics(formSchemaId: string): Promise<CategoryMetrics> {
    // Get form schema with business logic config
    const schema = await this.schemasRepository.findById(formSchemaId);
    if (!schema) {
      throw new Error('Form schema not found');
    }

    const businessLogic = schema.businessLogicConfig as QuizConfig;
    if (!businessLogic || businessLogic.type !== 'quiz') {
      throw new Error('Form is not a quiz template');
    }

    // Get all submissions
    const submissions = await this.submissionsRepository.findByFormSchema(
      formSchemaId,
      { limit: 10000, offset: 0 } // TODO: Implement pagination for large datasets
    );

    if (submissions.length === 0) {
      throw new Error('No submissions available for analytics');
    }

    // Calculate scores for each submission
    const scores = submissions.map((submission) =>
      this.calculateScore(submission.values, businessLogic)
    );

    // Calculate score distribution (0-20%, 20-40%, etc.)
    const scoreDistribution = this.calculateScoreDistribution(scores);

    // Calculate pass/fail rate
    const passingScore = businessLogic.passingScore || 70;
    const passedCount = scores.filter((score) => score >= passingScore).length;
    const failedCount = scores.length - passedCount;
    const passRate = (passedCount / scores.length) * 100;

    // Calculate average and median scores
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore =
      sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)];

    // Calculate question accuracy (percentage who got each question right)
    const questionAccuracy = this.calculateQuestionAccuracy(
      submissions.map((s) => s.values),
      businessLogic
    );

    const metrics: QuizMetrics = {
      category: 'quiz',
      totalSubmissions: submissions.length,
      averageScore: Math.round(averageScore * 10) / 10,
      medianScore: Math.round(medianScore * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      scoreDistribution,
      questionAccuracy,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      firstSubmissionAt: submissions[submissions.length - 1]?.submittedAt.toISOString(),
      lastSubmissionAt: submissions[0]?.submittedAt.toISOString(),
    };

    return metrics;
  }

  /**
   * Calculate score for a single submission
   *
   * @param answers - Submission answer values
   * @param config - Quiz business logic configuration
   * @returns Score percentage (0-100)
   */
  private calculateScore(
    answers: Record<string, any>,
    config: QuizConfig
  ): number {
    const scoringRules = config.scoringRules || [];
    const totalQuestions = scoringRules.length;

    if (totalQuestions === 0) {
      return 0;
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const rule of scoringRules) {
      const points = rule.points || 1;
      totalPoints += points;

      const userAnswer = answers[rule.fieldId];
      if (userAnswer === rule.correctAnswer) {
        earnedPoints += points;
      }
    }

    return totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  }

  /**
   * Calculate score distribution histogram
   *
   * @param scores - Array of score percentages
   * @returns Distribution object with score ranges and counts
   */
  private calculateScoreDistribution(scores: number[]): Record<string, number> {
    const ranges = {
      '0-20%': 0,
      '20-40%': 0,
      '40-60%': 0,
      '60-80%': 0,
      '80-100%': 0,
    };

    scores.forEach((score) => {
      if (score < 20) ranges['0-20%']++;
      else if (score < 40) ranges['20-40%']++;
      else if (score < 60) ranges['40-60%']++;
      else if (score < 80) ranges['60-80%']++;
      else ranges['80-100%']++;
    });

    return ranges;
  }

  /**
   * Calculate accuracy for each question
   *
   * @param allAnswers - Array of all submission answer objects
   * @param config - Quiz business logic configuration
   * @returns Map of field name to accuracy percentage
   */
  private calculateQuestionAccuracy(
    allAnswers: Record<string, any>[],
    config: QuizConfig
  ): Record<string, number> {
    const scoringRules = config.scoringRules || [];
    const accuracy: Record<string, number> = {};

    for (const rule of scoringRules) {
      let correctCount = 0;
      allAnswers.forEach((answers) => {
        if (answers[rule.fieldId] === rule.correctAnswer) {
          correctCount++;
        }
      });

      const accuracyPercent = (correctCount / allAnswers.length) * 100;
      accuracy[rule.fieldId] = Math.round(accuracyPercent * 10) / 10;
    }

    return accuracy;
  }
}
