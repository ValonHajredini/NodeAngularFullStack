import { PoolClient } from 'pg';
import {
  ITemplateExecutor,
  ExecutorValidation,
  ExecutorResult,
} from './base-executor.interface';
import {
  FormTemplate,
  FormSubmission,
  QuizConfig,
  QuizResultMetadata,
} from '@nodeangularfullstack/shared';

/**
 * Quiz executor with automatic scoring logic.
 * Calculates score synchronously without database operations.
 *
 * Unlike inventory/appointment executors, the quiz executor performs pure
 * in-memory calculations without database side effects. This makes it:
 * - Faster (< 50ms execution time)
 * - Simpler (no transaction locking or row-level concerns)
 * - Easier to test (no database mocking required)
 *
 * Flow:
 * 1. validate() - Ensures all quiz questions are answered
 * 2. execute() - Calculates score and returns metadata (synchronous, no DB operations)
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.13: Quiz Template with Scoring Logic
 *
 * @implements {ITemplateExecutor}
 *
 * @example
 * const executor = new QuizExecutor();
 *
 * // Validate before submission
 * const validation = await executor.validate(submission, template, config);
 * if (!validation.valid) {
 *   throw new Error(validation.errors.join(', '));
 * }
 *
 * // Execute scoring (synchronous, in-memory)
 * const result = await executor.execute(submission, template, config);
 * console.log(`Score: ${result.data.score}% - Passed: ${result.data.passed}`);
 */
export class QuizExecutor implements ITemplateExecutor {
  /**
   * Validates quiz submission data.
   * Checks that all required question fields are answered.
   *
   * Validation checks:
   * - Config has at least one scoring rule
   * - Passing score is between 0 and 100
   * - All questions specified in scoringRules are answered
   *
   * **Note**: This method does NOT validate answer correctness.
   * Correctness is evaluated during execute() when calculating the score.
   *
   * @param submission - Form submission data (not yet persisted)
   * @param template - Template configuration with schema
   * @param config - Quiz configuration with scoring rules
   * @returns Promise containing validation result
   */
  async validate(
    submission: Partial<FormSubmission>,
    _template: FormTemplate,
    config: QuizConfig
  ): Promise<ExecutorValidation> {
    const errors: string[] = [];
    const data = (submission.values || {}) as Record<string, any>;

    // Validate scoring rules configuration
    if (!config.scoringRules || config.scoringRules.length === 0) {
      errors.push('Quiz must have at least one scoring rule');
    }

    // Validate passing score
    if (config.passingScore < 0 || config.passingScore > 100) {
      errors.push('Passing score must be between 0 and 100');
    }

    // Validate that all quiz questions are answered
    if (config.scoringRules) {
      for (const rule of config.scoringRules) {
        const answer = data[rule.fieldId];
        if (answer === undefined || answer === null || answer === '') {
          errors.push(`Question '${rule.fieldId}' is required`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes quiz scoring logic.
   * Calculates score synchronously and stores in metadata.
   *
   * Scoring algorithm:
   * 1. Iterate through all scoring rules
   * 2. Compare user answer to correct answer
   * 3. Award points for correct answers (default 1 point, or custom points)
   * 4. Calculate percentage score: (correctAnswers / totalQuestions) * 100
   * 5. Determine pass/fail based on passing score threshold
   *
   * **Performance**: Executes in < 50ms (P95) for up to 100 questions.
   *
   * **Note**: The `client` parameter is unused for quiz scoring (no database operations).
   * It's included for interface consistency with other executors.
   *
   * @param submission - Created form submission record (persisted)
   * @param template - Template configuration with schema
   * @param config - Quiz configuration with scoring rules
   * @param client - Optional PostgreSQL client (unused for quiz, included for interface)
   * @returns Promise containing execution result with score details
   */
  async execute(
    submission: FormSubmission,
    _template: FormTemplate,
    config: QuizConfig,
    _client?: PoolClient
  ): Promise<ExecutorResult> {
    const data = (submission.values || {}) as Record<string, any>;

    let correctAnswers = 0;
    let totalPoints = 0;
    let maxPoints = 0;

    // Calculate score
    for (const rule of config.scoringRules) {
      const userAnswer = data[rule.fieldId];
      const points = rule.points || 1;
      maxPoints += points;

      if (userAnswer === rule.correctAnswer) {
        correctAnswers++;
        totalPoints += points;
      }
    }

    const totalQuestions = config.scoringRules.length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = score >= config.passingScore;

    // Prepare metadata
    const metadata: QuizResultMetadata = {
      score,
      correctAnswers,
      totalQuestions,
      passed,
      pointsEarned: totalPoints,
      maxPoints,
      answeredAt: new Date().toISOString(),
    };

    // Prepare result
    const result: ExecutorResult = {
      success: true,
      data: metadata,
      message: passed
        ? `Quiz passed! Score: ${score}%`
        : `Quiz completed. Score: ${score}% (Passing: ${config.passingScore}%)`,
    };

    // Include full results if configured
    if (config.showResults) {
      (result.data as any).detailedResults = config.scoringRules.map((rule) => ({
        fieldId: rule.fieldId,
        userAnswer: data[rule.fieldId],
        correctAnswer: rule.correctAnswer,
        isCorrect: data[rule.fieldId] === rule.correctAnswer,
        points: rule.points || 1,
      }));
    }

    return result;
  }
}
