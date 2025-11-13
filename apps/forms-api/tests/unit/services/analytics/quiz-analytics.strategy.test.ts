/**
 * QuizAnalyticsStrategy Unit Tests
 *
 * Tests quiz-specific analytics strategy with mocked repository responses.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 */

import { QuizAnalyticsStrategy } from '../../../../src/services/analytics/strategies/quiz-analytics.strategy';
import { AnalyticsRepository } from '../../../../src/repositories/analytics.repository';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('QuizAnalyticsStrategy', () => {
  let strategy: QuizAnalyticsStrategy;
  let mockRepository: jest.Mocked<AnalyticsRepository>;

  beforeEach(() => {
    // Create mock repository with jest.fn() for all methods
    mockRepository = {
      getSubmissionCounts: jest.fn(),
      getPollOptionCounts: jest.fn(),
      getQuizScoreBuckets: jest.fn(),
      getChoiceBreakdown: jest.fn(),
      getSubmissionsByTimeWindow: jest.fn(),
      getAllSubmissionValues: jest.fn(),
    } as any;

    strategy = new QuizAnalyticsStrategy(mockRepository);
  });

  describe('supports', () => {
    it('should return true for QUIZ category', () => {
      expect(strategy.supports(TemplateCategory.QUIZ)).toBe(true);
    });

    it('should return false for non-QUIZ categories', () => {
      expect(strategy.supports(TemplateCategory.POLLS)).toBe(false);
      expect(strategy.supports(TemplateCategory.ECOMMERCE)).toBe(false);
      expect(strategy.supports(TemplateCategory.SERVICES)).toBe(false);
      expect(strategy.supports(TemplateCategory.DATA_COLLECTION)).toBe(false);
      expect(strategy.supports(TemplateCategory.EVENTS)).toBe(false);
    });

    it('should return false for null category', () => {
      expect(strategy.supports(null)).toBe(false);
    });
  });

  describe('buildMetrics', () => {
    const formId = '123e4567-e89b-42d3-a456-426614174000';
    const tenantId = 'tenant-abc';

    it('should return quiz metrics with score statistics', async () => {
      // Mock submission counts
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 200,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-15T12:30:00.000Z',
      });

      // Mock score buckets
      mockRepository.getQuizScoreBuckets.mockResolvedValue([
        { bucket: '0-20', count: 10 },
        { bucket: '21-40', count: 15 },
        { bucket: '41-60', count: 25 },
        { bucket: '61-80', count: 80 },
        { bucket: '81-100', count: 70 },
      ]);

      // Mock submission values for statistical calculations
      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 85, q1: true, q2: true, q3: false },
        { score: 75, q1: true, q2: false, q3: true },
        { score: 90, q1: true, q2: true, q3: true },
        { score: 55, q1: false, q2: true, q3: false },
        { score: 40, q1: false, q2: false, q3: true },
      ]);

      const result = await strategy.buildMetrics(formId, tenantId);

      expect(result.category).toBe('quiz');
      expect(result.totalSubmissions).toBe(200);
      expect(result.scoreDistribution).toEqual({
        '0-20': 10,
        '21-40': 15,
        '41-60': 25,
        '61-80': 80,
        '81-100': 70,
      });
      expect(result.averageScore).toBeCloseTo(69, 0); // (85+75+90+55+40)/5 = 69
      expect(result.medianScore).toBe(75); // Middle value: [40, 55, 75, 85, 90]
      expect(result.passRate).toBe(60); // 3 out of 5 passed (≥60)
      expect(result.highestScore).toBe(90);
      expect(result.lowestScore).toBe(40);
      expect(result.questionAccuracy).toEqual({
        q1: 60, // 3/5 correct
        q2: 60, // 3/5 correct
        q3: 60, // 3/5 correct
      });
    });

    it('should handle zero submissions gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 0,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.category).toBe('quiz');
      expect(result.totalSubmissions).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.medianScore).toBe(0);
      expect(result.passRate).toBe(0);
      expect(result.scoreDistribution).toEqual({});
      expect(result.questionAccuracy).toEqual({});
      expect(result.highestScore).toBe(0);
      expect(result.lowestScore).toBe(0);

      // Should not call other repository methods when no submissions
      expect(mockRepository.getQuizScoreBuckets).not.toHaveBeenCalled();
      expect(mockRepository.getAllSubmissionValues).not.toHaveBeenCalled();
    });

    it('should handle submissions with no valid scores', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 50,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { comment: 'No score field' },
        { score: null },
        { score: 'invalid' },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.averageScore).toBe(0);
      expect(result.medianScore).toBe(0);
      expect(result.passRate).toBe(0);
      expect(result.highestScore).toBe(0);
      expect(result.lowestScore).toBe(0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No valid scores found')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should calculate median correctly for even number of scores', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 4,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-05T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 50 },
        { score: 60 },
        { score: 70 },
        { score: 80 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Median of [50, 60, 70, 80] = (60 + 70) / 2 = 65
      expect(result.medianScore).toBe(65);
    });

    it('should calculate median correctly for odd number of scores', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-05T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 40 },
        { score: 55 },
        { score: 75 },
        { score: 85 },
        { score: 90 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Median of [40, 55, 75, 85, 90] = 75 (middle value)
      expect(result.medianScore).toBe(75);
    });

    it('should calculate pass rate with custom passing threshold', async () => {
      const customStrategy = new QuizAnalyticsStrategy(mockRepository, 'score', 70);

      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 80 },
        { score: 75 },
        { score: 65 },
        { score: 55 },
      ]);

      const result = await customStrategy.buildMetrics(formId, null);

      // Only 2 out of 4 scores are >= 70
      expect(result.passRate).toBe(50);
    });

    it('should handle string scores and convert to numbers', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 3,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-03T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: '80' },
        { score: '70' },
        { score: '60' },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.averageScore).toBe(70);
      expect(result.highestScore).toBe(80);
      expect(result.lowestScore).toBe(60);
    });

    it('should calculate question accuracy correctly', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 4,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-04T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 100, q1: true, q2: true, q3: true },
        { score: 75, q1: true, q2: false, q3: true },
        { score: 50, q1: false, q2: true, q3: false },
        { score: 25, q1: false, q2: false, q3: false },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.questionAccuracy['q1']).toBe(50); // 2/4 correct
      expect(result.questionAccuracy['q2']).toBe(50); // 2/4 correct
      expect(result.questionAccuracy['q3']).toBe(50); // 2/4 correct
    });

    it('should handle numeric question values (1 = correct, 0 = incorrect)', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 3,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-03T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 100, q1: 1, q2: 1 },
        { score: 50, q1: 1, q2: 0 },
        { score: 0, q1: 0, q2: 0 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.questionAccuracy['q1']).toBeCloseTo(66.67, 1); // 2/3 correct
      expect(result.questionAccuracy['q2']).toBeCloseTo(33.33, 1); // 1/3 correct
    });

    it('should handle string question values (true/false, correct/incorrect)', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 2,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-02T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 100, q1: 'true', q2: 'correct' },
        { score: 0, q1: 'false', q2: 'incorrect' },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.questionAccuracy['q1']).toBe(50); // 1/2 correct
      expect(result.questionAccuracy['q2']).toBe(50); // 1/2 correct
    });

    it('should exclude non-question keys from accuracy calculation', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 1,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-01T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        {
          score: 100,
          q1: true,
          submitted_at: '2025-01-01',
          user_id: 'user123',
          metadata: { foo: 'bar' },
        },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Only q1 should be in questionAccuracy
      expect(Object.keys(result.questionAccuracy)).toEqual(['q1']);
      expect(result.questionAccuracy['q1']).toBe(100);
    });

    it('should pass tenant ID to repository methods', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-05T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 80 },
      ]);

      await strategy.buildMetrics(formId, tenantId);

      expect(mockRepository.getSubmissionCounts).toHaveBeenCalledWith(formId, tenantId);
      expect(mockRepository.getQuizScoreBuckets).toHaveBeenCalledWith(formId, 'score', tenantId);
      expect(mockRepository.getAllSubmissionValues).toHaveBeenCalledWith(formId, tenantId);
    });

    it('should use default field key "score"', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-02T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 75 },
      ]);

      await strategy.buildMetrics(formId, null);

      expect(mockRepository.getQuizScoreBuckets).toHaveBeenCalledWith(formId, 'score', null);
    });

    it('should support custom score field key when provided', async () => {
      const customStrategy = new QuizAnalyticsStrategy(mockRepository, 'quiz_score', 60);

      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 5,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-02T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { quiz_score: 85 },
      ]);

      await customStrategy.buildMetrics(formId, null);

      expect(mockRepository.getQuizScoreBuckets).toHaveBeenCalledWith(
        formId,
        'quiz_score',
        null
      );
    });

    it('should handle repository errors and rethrow with context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockRepository.getSubmissionCounts.mockRejectedValue(
        new Error('Database timeout')
      );

      await expect(strategy.buildMetrics(formId, null)).rejects.toThrow(
        'Failed to build quiz analytics: Database timeout'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[QuizAnalyticsStrategy] Error building metrics for form'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should round average score to 2 decimal places', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 3,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-03T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 75.5 },
        { score: 82.3 },
        { score: 91.7 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // (75.5 + 82.3 + 91.7) / 3 = 83.166...
      expect(result.averageScore).toBe(83.17);
    });

    it('should return valid QuizMetrics type structure', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      mockRepository.getQuizScoreBuckets.mockResolvedValue([]);

      mockRepository.getAllSubmissionValues.mockResolvedValue([
        { score: 75 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Verify structure matches QuizMetrics interface
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('totalSubmissions');
      expect(result).toHaveProperty('averageScore');
      expect(result).toHaveProperty('medianScore');
      expect(result).toHaveProperty('passRate');
      expect(result).toHaveProperty('scoreDistribution');
      expect(result).toHaveProperty('questionAccuracy');
      expect(result).toHaveProperty('highestScore');
      expect(result).toHaveProperty('lowestScore');
      expect(result).toHaveProperty('firstSubmissionAt');
      expect(result).toHaveProperty('lastSubmissionAt');

      expect(result.category).toBe('quiz');
    });
  });
});
