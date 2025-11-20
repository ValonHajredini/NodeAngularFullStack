/**
 * Unit Tests for PollExecutor
 * Tests poll voting validation, duplicate prevention, and vote aggregation
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.14: Poll Template with Vote Aggregation
 */

import { PollExecutor } from '../../../../src/services/template-executors/poll-executor';
import { FormSubmissionsRepository } from '../../../../src/repositories/form-submissions.repository';
import {
  FormTemplate,
  PollLogicConfig,
} from '@nodeangularfullstack/shared';

describe('PollExecutor', () => {
  let executor: PollExecutor;
  let mockSubmissionsRepo: jest.Mocked<FormSubmissionsRepository>;

  const mockConfig: PollLogicConfig = {
    type: 'poll',
    voteField: 'favorite_color',
    preventDuplicates: true,
    showResultsAfterVote: true,
    trackingMethod: 'session',
  };

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Quick Poll',
    category: 'POLLS' as any,
    templateSchema: {} as any,
    businessLogicConfig: mockConfig,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sessionId = 'session-abc123';

  beforeEach(() => {
    mockSubmissionsRepo = {
      checkDuplicateBySession: jest.fn(),
      aggregatePollVotes: jest.fn(),
    } as any;

    executor = new PollExecutor(mockSubmissionsRepo, sessionId);
  });

  describe('validate', () => {
    it('should pass validation for valid vote', async () => {
      mockSubmissionsRepo.checkDuplicateBySession.mockResolvedValue(0);

      const submission = {
        form_id: 'form-123',
        data: {
          favorite_color: 'blue',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(mockSubmissionsRepo.checkDuplicateBySession).toHaveBeenCalledWith(
        'form-123',
        sessionId
      );
    });

    it('should fail validation for missing vote field', async () => {
      const submission = {
        form_id: 'form-123',
        data: {},
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Vote field 'favorite_color' is required");
    });

    it('should fail validation for empty vote value', async () => {
      const submission = {
        form_id: 'form-123',
        data: {
          favorite_color: '',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Vote field 'favorite_color' is required");
    });

    it('should fail validation for duplicate vote', async () => {
      mockSubmissionsRepo.checkDuplicateBySession.mockResolvedValue(1);

      const submission = {
        form_id: 'form-123',
        data: {
          favorite_color: 'blue',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('You have already voted in this poll');
    });

    it('should skip duplicate check when preventDuplicates is false', async () => {
      const configNoDuplicateCheck: PollLogicConfig = {
        ...mockConfig,
        preventDuplicates: false,
      };

      const submission = {
        form_id: 'form-123',
        data: {
          favorite_color: 'blue',
        },
      };

      const result = await executor.validate(
        submission,
        mockTemplate,
        configNoDuplicateCheck
      );

      expect(result.valid).toBe(true);
      expect(mockSubmissionsRepo.checkDuplicateBySession).not.toHaveBeenCalled();
    });

    it('should fail validation for invalid tracking method', async () => {
      const invalidConfig: PollLogicConfig = {
        ...mockConfig,
        trackingMethod: 'invalid' as any,
      };

      const submission = {
        form_id: 'form-123',
        data: {
          favorite_color: 'blue',
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid tracking method. Must be: session, ip, or fingerprint'
      );
    });
  });

  describe('execute', () => {
    const mockSubmission: any = {
      id: 'sub-123',
      form_id: 'form-123',
      data: {
        favorite_color: 'blue',
      },
      submitted_at: new Date(),
      submitter_ip: '192.168.1.1',
    };

    it('should record vote with metadata', async () => {
      mockSubmissionsRepo.aggregatePollVotes.mockResolvedValue([
        { vote_value: 'blue', count: 5 },
        { vote_value: 'red', count: 3 },
        { vote_value: 'green', count: 2 },
      ]);

      const result = await executor.execute(
        mockSubmission,
        mockTemplate,
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.data.session_id).toBe(sessionId);
      expect(result.data.vote_value).toBe('blue');
      expect(result.data.voted_at).toBeDefined();
    });

    it('should include poll results when showResultsAfterVote is true', async () => {
      mockSubmissionsRepo.aggregatePollVotes.mockResolvedValue([
        { vote_value: 'blue', count: 5 },
        { vote_value: 'red', count: 3 },
      ]);

      const result = await executor.execute(
        mockSubmission,
        mockTemplate,
        mockConfig
      );

      expect(result.data.poll_results).toBeDefined();
      expect(result.data.poll_results.total_votes).toBe(8);
      expect(result.data.poll_results.vote_counts).toEqual({
        blue: 5,
        red: 3,
      });
      expect(result.data.poll_results.vote_percentages).toEqual({
        blue: 63, // 5/8 = 62.5% → 63%
        red: 38, // 3/8 = 37.5% → 38%
      });
    });

    it('should NOT include poll results when showResultsAfterVote is false', async () => {
      const configNoResults: PollLogicConfig = {
        ...mockConfig,
        showResultsAfterVote: false,
      };

      const result = await executor.execute(
        mockSubmission,
        mockTemplate,
        configNoResults
      );

      expect(result.data.poll_results).toBeUndefined();
      expect(result.data.session_id).toBe(sessionId);
      expect(result.data.vote_value).toBe('blue');
    });

    it('should handle poll with zero votes', async () => {
      mockSubmissionsRepo.aggregatePollVotes.mockResolvedValue([]);

      const result = await executor.execute(
        mockSubmission,
        mockTemplate,
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.data.poll_results.total_votes).toBe(0);
      expect(result.data.poll_results.vote_counts).toEqual({});
      expect(result.data.poll_results.vote_percentages).toEqual({});
    });

    it('should correctly calculate percentages with rounding', async () => {
      mockSubmissionsRepo.aggregatePollVotes.mockResolvedValue([
        { vote_value: 'option_a', count: 10 },
        { vote_value: 'option_b', count: 7 },
        { vote_value: 'option_c', count: 6 },
      ]);

      const result = await executor.execute(
        mockSubmission,
        mockTemplate,
        mockConfig
      );

      const percentages = result.data.poll_results.vote_percentages;
      expect(percentages.option_a).toBe(43); // 10/23 = 43.48% → 43%
      expect(percentages.option_b).toBe(30); // 7/23 = 30.43% → 30%
      expect(percentages.option_c).toBe(26); // 6/23 = 26.09% → 26%
    });
  });
});
