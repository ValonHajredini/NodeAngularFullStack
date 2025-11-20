import { QuizExecutor } from '../../../../src/services/template-executors/quiz-executor';
import { FormTemplate, FormSubmission, QuizConfig } from '@nodeangularfullstack/shared';

describe('QuizExecutor', () => {
  let executor: QuizExecutor;

  const mockConfig: QuizConfig = {
    type: 'quiz',
    scoringRules: [
      { fieldId: 'q1', correctAnswer: 'B', points: 2 },
      { fieldId: 'q2', correctAnswer: 'C', points: 2 },
      { fieldId: 'q3', correctAnswer: 'A', points: 1 },
      { fieldId: 'q4', correctAnswer: 'D', points: 1 },
      { fieldId: 'q5', correctAnswer: 'B', points: 1 },
    ],
    passingScore: 60,
    showResults: true,
  };

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Quiz Assessment',
    category: 'quiz' as any,
    templateSchema: {} as any,
    businessLogicConfig: mockConfig,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    executor = new QuizExecutor();
  });

  describe('validate', () => {
    it('should pass validation for complete quiz submission', async () => {
      const submission = {
        values: {
          q1: 'B',
          q2: 'C',
          q3: 'A',
          q4: 'D',
          q5: 'B',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail validation for missing answers', async () => {
      const submission = {
        values: {
          q1: 'B',
          q2: 'C',
          // q3, q4, q5 missing
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('q3'))).toBe(true);
    });

    it('should fail validation for empty scoring rules', async () => {
      const invalidConfig: QuizConfig = {
        ...mockConfig,
        scoringRules: [],
      };

      const submission = { values: {} };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quiz must have at least one scoring rule');
    });

    it('should fail validation for invalid passing score', async () => {
      const invalidConfig: QuizConfig = {
        ...mockConfig,
        passingScore: 150,
      };

      const submission = { values: { q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'A' } };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Passing score must be between 0 and 100');
    });

    it('should fail validation for null or empty answers', async () => {
      const submission = {
        values: {
          q1: '',
          q2: null,
          q3: undefined,
          q4: 'D',
          q5: 'B',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3); // q1, q2, q3 are invalid
    });
  });

  describe('execute', () => {
    const mockSubmission: FormSubmission = {
      id: 'sub-123',
      formSchemaId: 'schema-123',
      values: {
        q1: 'B', // Correct (2 pts)
        q2: 'C', // Correct (2 pts)
        q3: 'A', // Correct (1 pt)
        q4: 'A', // Wrong (0 pts)
        q5: 'B', // Correct (1 pt)
      },
      submittedAt: new Date(),
      submitterIp: '127.0.0.1',
    };

    it('should calculate correct score (80% with custom points)', async () => {
      const result = await executor.execute(mockSubmission, mockTemplate, mockConfig);

      expect(result.success).toBe(true);
      expect(result.data.score).toBe(80); // 4 correct out of 5 = 80%
      expect(result.data.correctAnswers).toBe(4);
      expect(result.data.totalQuestions).toBe(5);
      expect(result.data.pointsEarned).toBe(6); // 2+2+1+1 = 6 pts
      expect(result.data.maxPoints).toBe(7); // 2+2+1+1+1 = 7 pts
      expect(result.data.passed).toBe(true); // 80% >= 60%
    });

    it('should mark as failed when score below passing threshold', async () => {
      const failingSubmission: FormSubmission = {
        ...mockSubmission,
        values: {
          q1: 'A', // Wrong
          q2: 'B', // Wrong
          q3: 'B', // Wrong
          q4: 'D', // Correct (1 pt)
          q5: 'A', // Wrong
        },
      };

      const result = await executor.execute(failingSubmission, mockTemplate, mockConfig);

      expect(result.success).toBe(true);
      expect(result.data.score).toBe(20); // 1 correct out of 5 = 20%
      expect(result.data.passed).toBe(false); // 20% < 60%
      expect(result.message).toContain('Passing: 60%');
    });

    it('should include detailed results when showResults is true', async () => {
      const result = await executor.execute(mockSubmission, mockTemplate, mockConfig);

      expect(result.data.detailedResults).toBeDefined();
      expect(result.data.detailedResults.length).toBe(5);
      expect(result.data.detailedResults[0]).toMatchObject({
        fieldId: 'q1',
        userAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        points: 2,
      });
      expect(result.data.detailedResults[3]).toMatchObject({
        fieldId: 'q4',
        userAnswer: 'A',
        correctAnswer: 'D',
        isCorrect: false,
        points: 1,
      });
    });

    it('should NOT include detailed results when showResults is false', async () => {
      const configNoResults: QuizConfig = {
        ...mockConfig,
        showResults: false,
      };

      const result = await executor.execute(mockSubmission, mockTemplate, configNoResults);

      expect(result.data.detailedResults).toBeUndefined();
    });

    it('should handle perfect score (100%)', async () => {
      const perfectSubmission: FormSubmission = {
        ...mockSubmission,
        values: {
          q1: 'B',
          q2: 'C',
          q3: 'A',
          q4: 'D',
          q5: 'B',
        },
      };

      const result = await executor.execute(perfectSubmission, mockTemplate, mockConfig);

      expect(result.data.score).toBe(100);
      expect(result.data.correctAnswers).toBe(5);
      expect(result.data.passed).toBe(true);
      expect(result.data.pointsEarned).toBe(7);
      expect(result.message).toContain('passed');
    });

    it('should handle zero score (0%)', async () => {
      const zeroSubmission: FormSubmission = {
        ...mockSubmission,
        values: {
          q1: 'A',
          q2: 'A',
          q3: 'B',
          q4: 'A',
          q5: 'A',
        },
      };

      const result = await executor.execute(zeroSubmission, mockTemplate, mockConfig);

      expect(result.data.score).toBe(0);
      expect(result.data.correctAnswers).toBe(0);
      expect(result.data.passed).toBe(false);
      expect(result.data.pointsEarned).toBe(0);
    });

    it('should execute synchronously without database client', async () => {
      const startTime = Date.now();

      await executor.execute(mockSubmission, mockTemplate, mockConfig);

      const executionTime = Date.now() - startTime;

      // Should execute in < 50ms (in-memory calculation)
      expect(executionTime).toBeLessThan(50);
    });

    it('should include answeredAt timestamp', async () => {
      const result = await executor.execute(mockSubmission, mockTemplate, mockConfig);

      expect(result.data.answeredAt).toBeDefined();
      expect(typeof result.data.answeredAt).toBe('string');
      expect(new Date(result.data.answeredAt).toString()).not.toBe('Invalid Date');
    });

    it('should default points to 1 when not specified', async () => {
      const configDefaultPoints: QuizConfig = {
        type: 'quiz',
        scoringRules: [
          { fieldId: 'q1', correctAnswer: 'A' }, // No points specified
          { fieldId: 'q2', correctAnswer: 'B' }, // No points specified
        ],
        passingScore: 50,
        showResults: true,
      };

      const submission: FormSubmission = {
        id: 'sub-123',
        formSchemaId: 'schema-123',
        values: {
          q1: 'A', // Correct
          q2: 'C', // Wrong
        },
        submittedAt: new Date(),
        submitterIp: '127.0.0.1',
      };

      const result = await executor.execute(submission, mockTemplate, configDefaultPoints);

      expect(result.data.pointsEarned).toBe(1); // 1 correct * 1 point (default)
      expect(result.data.maxPoints).toBe(2); // 2 questions * 1 point each
      expect(result.data.score).toBe(50); // 1/2 = 50%
    });
  });
});
