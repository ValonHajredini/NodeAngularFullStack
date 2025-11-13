/**
 * PollAnalyticsStrategy Unit Tests
 *
 * Tests poll-specific analytics strategy with mocked repository responses.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 */

import { PollAnalyticsStrategy } from '../../../../src/services/analytics/strategies/poll-analytics.strategy';
import { AnalyticsRepository } from '../../../../src/repositories/analytics.repository';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('PollAnalyticsStrategy', () => {
  let strategy: PollAnalyticsStrategy;
  let mockRepository: jest.Mocked<AnalyticsRepository>;

  beforeEach(() => {
    // Create mock repository with jest.fn() for all methods
    mockRepository = {
      getSubmissionCounts: jest.fn(),
      getPollOptionCounts: jest.fn(),
      getChoiceBreakdown: jest.fn(),
      getSubmissionsByTimeWindow: jest.fn(),
      getAllSubmissionValues: jest.fn(),
      getQuizScoreBuckets: jest.fn(),
    } as any;

    strategy = new PollAnalyticsStrategy(mockRepository);
  });

  describe('supports', () => {
    it('should return true for POLLS category', () => {
      expect(strategy.supports(TemplateCategory.POLLS)).toBe(true);
    });

    it('should return false for non-POLLS categories', () => {
      expect(strategy.supports(TemplateCategory.QUIZ)).toBe(false);
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

    it('should return poll metrics with vote counts and percentages', async () => {
      // Mock submission counts
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 150,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-15T12:30:00.000Z',
      });

      // Mock poll option counts
      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Option A', count: 75 },
        { option: 'Option B', count: 45 },
        { option: 'Option C', count: 30 },
      ]);

      const result = await strategy.buildMetrics(formId, tenantId);

      expect(result.category).toBe('polls');
      expect(result.totalSubmissions).toBe(150);
      expect(result.voteCounts).toEqual({
        'Option A': 75,
        'Option B': 45,
        'Option C': 30,
      });
      expect(result.votePercentages).toEqual({
        'Option A': 50,
        'Option B': 30,
        'Option C': 20,
      });
      expect(result.uniqueVoters).toBe(150);
      expect(result.mostPopularOption).toBe('Option A');
      expect(result.firstSubmissionAt).toBe('2025-01-01T00:00:00.000Z');
      expect(result.lastSubmissionAt).toBe('2025-01-15T12:30:00.000Z');
    });

    it('should handle zero submissions gracefully', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 0,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      });

      const result = await strategy.buildMetrics(formId, null);

      expect(result.category).toBe('polls');
      expect(result.totalSubmissions).toBe(0);
      expect(result.voteCounts).toEqual({});
      expect(result.votePercentages).toEqual({});
      expect(result.uniqueVoters).toBe(0);
      expect(result.mostPopularOption).toBe('');
      expect(result.firstSubmissionAt).toBeUndefined();
      expect(result.lastSubmissionAt).toBeUndefined();

      // Should not call getPollOptionCounts when no submissions
      expect(mockRepository.getPollOptionCounts).not.toHaveBeenCalled();
    });

    it('should calculate percentages correctly with decimal precision', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 100,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Yes', count: 67 },
        { option: 'No', count: 33 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.votePercentages['Yes']).toBe(67);
      expect(result.votePercentages['No']).toBe(33);
    });

    it('should identify most popular option correctly', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 200,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-15T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Pizza', count: 120 },
        { option: 'Burger', count: 50 },
        { option: 'Salad', count: 30 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.mostPopularOption).toBe('Pizza');
    });

    it('should handle ties by selecting first option', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 100,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      // Tied votes (repository returns sorted by count DESC, then alphabetically)
      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Option A', count: 50 },
        { option: 'Option B', count: 50 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.mostPopularOption).toBe('Option A');
    });

    it('should handle empty option counts (no votes with field key)', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 50,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-05T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.voteCounts).toEqual({});
      expect(result.votePercentages).toEqual({});
      expect(result.mostPopularOption).toBe('');
    });

    it('should pass tenant ID to repository methods', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 25,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-05T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Yes', count: 15 },
        { option: 'No', count: 10 },
      ]);

      await strategy.buildMetrics(formId, tenantId);

      expect(mockRepository.getSubmissionCounts).toHaveBeenCalledWith(formId, tenantId);
      expect(mockRepository.getPollOptionCounts).toHaveBeenCalledWith(
        formId,
        'poll_option',
        tenantId
      );
    });

    it('should use default field key "poll_option"', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 10,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-02T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'A', count: 10 },
      ]);

      await strategy.buildMetrics(formId, null);

      expect(mockRepository.getPollOptionCounts).toHaveBeenCalledWith(
        formId,
        'poll_option',
        null
      );
    });

    it('should support custom field key when provided', async () => {
      const customStrategy = new PollAnalyticsStrategy(mockRepository, 'vote_choice');

      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 20,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-03T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Choice 1', count: 20 },
      ]);

      await customStrategy.buildMetrics(formId, null);

      expect(mockRepository.getPollOptionCounts).toHaveBeenCalledWith(
        formId,
        'vote_choice',
        null
      );
    });

    it('should handle repository errors and rethrow with context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockRepository.getSubmissionCounts.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(strategy.buildMetrics(formId, null)).rejects.toThrow(
        'Failed to build poll analytics: Database connection failed'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PollAnalyticsStrategy] Error building metrics for form'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should round vote percentages to 2 decimal places', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 100,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'A', count: 33 },
        { option: 'B', count: 33 },
        { option: 'C', count: 34 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      expect(result.votePercentages['A']).toBe(33);
      expect(result.votePercentages['B']).toBe(33);
      expect(result.votePercentages['C']).toBe(34);
    });

    it('should return valid PollMetrics type structure', async () => {
      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 50,
        firstSubmissionAt: '2025-01-01T00:00:00.000Z',
        lastSubmissionAt: '2025-01-10T00:00:00.000Z',
      });

      mockRepository.getPollOptionCounts.mockResolvedValue([
        { option: 'Red', count: 30 },
        { option: 'Blue', count: 20 },
      ]);

      const result = await strategy.buildMetrics(formId, null);

      // Verify structure matches PollMetrics interface
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('totalSubmissions');
      expect(result).toHaveProperty('voteCounts');
      expect(result).toHaveProperty('votePercentages');
      expect(result).toHaveProperty('uniqueVoters');
      expect(result).toHaveProperty('mostPopularOption');
      expect(result).toHaveProperty('firstSubmissionAt');
      expect(result).toHaveProperty('lastSubmissionAt');

      expect(result.category).toBe('polls');
    });
  });
});
