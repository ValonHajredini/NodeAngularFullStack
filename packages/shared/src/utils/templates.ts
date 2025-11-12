import { QuizResultMetadata } from '../types/templates.types';

/**
 * Type guard to verify an arbitrary metadata object matches QuizResultMetadata.
 * Ensures analytics and UI layers only operate on well-formed quiz submissions.
 */
export function isQuizResultMetadata(metadata: unknown): metadata is QuizResultMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  const candidate = metadata as Partial<QuizResultMetadata>;

  return (
    typeof candidate.score === 'number' &&
    typeof candidate.correctAnswers === 'number' &&
    typeof candidate.totalQuestions === 'number' &&
    typeof candidate.passed === 'boolean' &&
    typeof candidate.answeredAt === 'string'
  );
}
