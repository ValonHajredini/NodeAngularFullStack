/**
 * Quiz Score Calculation Utilities
 *
 * Provides functions to calculate quiz scores based on field metadata and submission values.
 *
 * @since 2025-11-15
 */

import { FormField, QuizFieldMetadata } from '../types/forms.types';

/**
 * Quiz score result containing points earned and maximum possible points
 */
export interface QuizScoreResult {
  /** Points earned for correct answers */
  score: number;
  /** Maximum possible points for this quiz */
  maxScore: number;
  /** Score as a percentage (0-100) */
  percentage: number;
  /** Number of correct answers */
  correctAnswers: number;
  /** Total number of quiz questions */
  totalQuestions: number;
}

/**
 * Calculates quiz score for a submission based on field metadata.
 *
 * Process:
 * 1. Iterate through all form fields
 * 2. For fields with quiz metadata (correctAnswer, points):
 *    - Check if submission value matches correctAnswer
 *    - Add points to score if correct
 *    - Track maxScore from all quiz questions
 * 3. Calculate percentage score
 *
 * @param fields - Array of form fields with metadata
 * @param submissionValues - Submitted values as key-value pairs (fieldName → value)
 * @returns Quiz score result with points, percentage, and accuracy
 *
 * @example
 * ```typescript
 * const fields = [
 *   { id: 'q1', fieldName: 'question_1', metadata: { correctAnswer: 'paris', points: 33 } },
 *   { id: 'q2', fieldName: 'question_2', metadata: { correctAnswer: '4', points: 34 } }
 * ];
 * const submission = { question_1: 'paris', question_2: '4' };
 * const result = calculateQuizScore(fields, submission);
 * // { score: 67, maxScore: 67, percentage: 100, correctAnswers: 2, totalQuestions: 2 }
 * ```
 */
export function calculateQuizScore(
  fields: FormField[],
  submissionValues: Record<string, any>
): QuizScoreResult {
  let score = 0;
  let maxScore = 0;
  let correctAnswers = 0;
  let totalQuestions = 0;

  // Iterate through all fields to find quiz questions
  fields.forEach((field) => {
    // Check if field has quiz metadata (correctAnswer must exist)
    const quizMetadata = field.metadata as QuizFieldMetadata | undefined;
    if (!quizMetadata || !quizMetadata.correctAnswer) {
      return; // Skip fields without quiz metadata
    }

    // Skip fields explicitly excluded from quiz scoring (e.g., name, email fields)
    if (quizMetadata.excludeFromQuiz) {
      return;
    }

    // This is a quiz question
    totalQuestions++;

    // Get points for this question (default to 1 if not specified)
    const points = quizMetadata.points || 1;
    maxScore += points;

    // Get the submitted answer for this field
    const fieldKey = field.fieldName || field.id;
    const submittedAnswer = submissionValues[fieldKey];

    // Check if answer is correct (case-insensitive string comparison)
    const correctAnswer = String(quizMetadata.correctAnswer).toLowerCase().trim();
    const userAnswer = String(submittedAnswer || '').toLowerCase().trim();

    if (userAnswer === correctAnswer) {
      score += points;
      correctAnswers++;
    }
  });

  // Calculate percentage (handle division by zero)
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return {
    score,
    maxScore,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    correctAnswers,
    totalQuestions,
  };
}

/**
 * Calculates quiz scores for multiple submissions.
 *
 * @param fields - Array of form fields with metadata
 * @param submissions - Array of submission values
 * @returns Array of quiz score results
 *
 * @example
 * ```typescript
 * const scores = calculateQuizScoresForSubmissions(fields, [
 *   { question_1: 'paris', question_2: '4' },
 *   { question_1: 'london', question_2: '4' }
 * ]);
 * // [{ score: 67, ... }, { score: 34, ... }]
 * ```
 */
export function calculateQuizScoresForSubmissions(
  fields: FormField[],
  submissions: Record<string, any>[]
): QuizScoreResult[] {
  return submissions.map((submission) => calculateQuizScore(fields, submission));
}
