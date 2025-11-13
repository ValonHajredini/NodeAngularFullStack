/**
 * AnalyticsRepository Unit Tests
 *
 * Tests repository database operations with mocked pool connections.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 */

// Mock client state - initialized before imports
let mockClient: any;
let queryHistory: Array<{ query: string; values: any[] }> = [];
let mockResponses: Map<string, any> = new Map();
let mockError: Error | null = null;

// Mock the multi-database config module BEFORE importing AnalyticsRepository
jest.mock('../../../src/config/multi-database.config', () => {
  mockClient = {
    query: jest.fn(async (queryText: string, values: any[] = []) => {
      queryHistory.push({ query: queryText, values });

      // Check if error is set
      if (mockError) {
        const error = mockError;
        mockError = null; // Reset after throwing
        throw error;
      }

      // Find matching mock response
      for (const [pattern, response] of mockResponses.entries()) {
        if (queryText.includes(pattern)) {
          return response;
        }
      }

      // Default empty response
      return { rows: [] };
    }),
    release: jest.fn(),
  };

  return {
    formsPool: {
      connect: jest.fn(async () => mockClient),
    },
  };
});

// Import AFTER mock is set up
import { AnalyticsRepository } from '../../../src/repositories/analytics.repository';

/**
 * Helper to setup mock query response for specific pattern.
 */
function mockQueryResponse(pattern: string, response: { rows: any[] }) {
  mockResponses.set(pattern, response);
}

/**
 * Helper to inject an error for the next query.
 */
function mockQueryError(error: Error) {
  mockError = error;
}

/**
 * Helper to get query call history.
 */
function getQueryHistory() {
  return queryHistory;
}

/**
 * Reset mock state between tests.
 */
function resetMocks() {
  queryHistory = [];
  mockResponses.clear();
  mockError = null;
  jest.clearAllMocks();
}

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;

  beforeEach(() => {
    resetMocks();
    repository = new AnalyticsRepository();
  });

  describe('getSubmissionCounts', () => {
    it('should return submission counts for form with submissions', async () => {
      const mockResult = {
        rows: [
          {
            total_submissions: '150',
            first_submission_at: new Date('2025-01-01T00:00:00Z'),
            last_submission_at: new Date('2025-01-15T12:30:00Z'),
          },
        ],
      };

      mockQueryResponse('COUNT(*) as total_submissions', mockResult);

      const result = await repository.getSubmissionCounts(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(result.totalSubmissions).toBe(150);
      expect(result.firstSubmissionAt).toBe('2025-01-01T00:00:00.000Z');
      expect(result.lastSubmissionAt).toBe('2025-01-15T12:30:00.000Z');
    });

    it('should return zero counts when no submissions exist', async () => {
      const mockResult = {
        rows: [
          {
            total_submissions: '0',
            first_submission_at: null,
            last_submission_at: null,
          },
        ],
      };

      mockQueryResponse('COUNT(*) as total_submissions', mockResult);

      const result = await repository.getSubmissionCounts(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(result.totalSubmissions).toBe(0);
      expect(result.firstSubmissionAt).toBeNull();
      expect(result.lastSubmissionAt).toBeNull();
    });

    it('should include tenant filter when tenantId provided', async () => {
      const mockResult = {
        rows: [
          {
            total_submissions: '75',
            first_submission_at: new Date('2025-01-10T00:00:00Z'),
            last_submission_at: new Date('2025-01-15T00:00:00Z'),
          },
        ],
      };

      mockQueryResponse('COUNT(*) as total_submissions', mockResult);

      await repository.getSubmissionCounts(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc'
      );

      const history = getQueryHistory();
      expect(history[0].query).toContain('fsch.tenant_id = $2');
      expect(history[0].values).toEqual([
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc',
      ]);
    });

    it('should not include tenant filter when tenantId is null', async () => {
      const mockResult = {
        rows: [
          {
            total_submissions: '100',
            first_submission_at: new Date('2025-01-01T00:00:00Z'),
            last_submission_at: new Date('2025-01-15T00:00:00Z'),
          },
        ],
      };

      mockQueryResponse('COUNT(*) as total_submissions', mockResult);

      await repository.getSubmissionCounts(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      const history = getQueryHistory();
      expect(history[0].query).not.toContain('fsch.tenant_id = $2');
      expect(history[0].values).toEqual(['123e4567-e89b-42d3-a456-426614174000']);
    });

    it('should handle query errors and rethrow with context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockQueryError(new Error('Connection timeout'));

      await expect(
        repository.getSubmissionCounts('123e4567-e89b-42d3-a456-426614174000', null)
      ).rejects.toThrow('Failed to fetch submission counts: Connection timeout');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should parse totalSubmissions as integer', async () => {
      const mockResult = {
        rows: [
          {
            total_submissions: '999',
            first_submission_at: new Date('2025-01-01T00:00:00Z'),
            last_submission_at: new Date('2025-01-15T00:00:00Z'),
          },
        ],
      };

      mockQueryResponse('COUNT(*) as total_submissions', mockResult);

      const result = await repository.getSubmissionCounts(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(typeof result.totalSubmissions).toBe('number');
      expect(result.totalSubmissions).toBe(999);
    });
  });

  describe('getChoiceBreakdown', () => {
    it('should return choice breakdown with counts', async () => {
      const mockResult = {
        rows: [
          { field_key: 'poll_option', option_value: 'Option A', count: '75' },
          { field_key: 'poll_option', option_value: 'Option B', count: '45' },
          { field_key: 'poll_option', option_value: 'Option C', count: '30' },
        ],
      };

      mockQueryResponse('fs.values_json ->> $2 as option_value', mockResult);

      const result = await repository.getChoiceBreakdown(
        '123e4567-e89b-42d3-a456-426614174000',
        'poll_option',
        null
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        fieldKey: 'poll_option',
        optionValue: 'Option A',
        count: 75,
      });
      expect(result[1].count).toBe(45);
      expect(result[2].count).toBe(30);
    });

    it('should return empty array when no submissions exist', async () => {
      const mockResult = { rows: [] };

      mockQueryResponse('fs.values_json ->> $2 as option_value', mockResult);

      const result = await repository.getChoiceBreakdown(
        '123e4567-e89b-42d3-a456-426614174000',
        'poll_option',
        null
      );

      expect(result).toEqual([]);
    });

    it('should include tenant filter when tenantId provided', async () => {
      const mockResult = {
        rows: [{ field_key: 'poll_option', option_value: 'Option A', count: '50' }],
      };

      mockQueryResponse('fs.values_json ->> $2 as option_value', mockResult);

      await repository.getChoiceBreakdown(
        '123e4567-e89b-42d3-a456-426614174000',
        'poll_option',
        'tenant-xyz'
      );

      const history = getQueryHistory();
      expect(history[0].query).toContain('fsch.tenant_id = $3');
      expect(history[0].values).toEqual([
        '123e4567-e89b-42d3-a456-426614174000',
        'poll_option',
        'tenant-xyz',
      ]);
    });

    it('should order results by count descending', async () => {
      const mockResult = {
        rows: [
          { field_key: 'question_1', option_value: 'Yes', count: '120' },
          { field_key: 'question_1', option_value: 'No', count: '80' },
          { field_key: 'question_1', option_value: 'Maybe', count: '45' },
        ],
      };

      mockQueryResponse('fs.values_json ->> $2 as option_value', mockResult);

      const result = await repository.getChoiceBreakdown(
        '123e4567-e89b-42d3-a456-426614174000',
        'question_1',
        null
      );

      // Verify descending order
      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
      expect(result[1].count).toBeGreaterThanOrEqual(result[2].count);
    });

    it('should handle query errors and rethrow with context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockQueryError(new Error('Invalid JSONB key'));

      await expect(
        repository.getChoiceBreakdown(
          '123e4567-e89b-42d3-a456-426614174000',
          'poll_option',
          null
        )
      ).rejects.toThrow('Failed to fetch choice breakdown: Invalid JSONB key');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should pass fieldKey in query parameters', async () => {
      const mockResult = {
        rows: [{ field_key: 'custom_field', option_value: 'Value', count: '10' }],
      };

      mockQueryResponse('fs.values_json ->> $2 as option_value', mockResult);

      await repository.getChoiceBreakdown(
        '123e4567-e89b-42d3-a456-426614174000',
        'custom_field',
        null
      );

      const history = getQueryHistory();
      expect(history[0].values[1]).toBe('custom_field');
    });
  });

  describe('getSubmissionsByTimeWindow', () => {
    it('should return time window breakdown for day granularity', async () => {
      const mockResult = {
        rows: [
          { time_bucket: '2025-01-01', count: '12' },
          { time_bucket: '2025-01-02', count: '18' },
          { time_bucket: '2025-01-03', count: '15' },
        ],
      };

      mockQueryResponse('DATE(fs.submitted_at) as time_bucket', mockResult);

      const result = await repository.getSubmissionsByTimeWindow(
        '123e4567-e89b-42d3-a456-426614174000',
        'day',
        null
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ timeBucket: '2025-01-01', count: 12 });
      expect(result[1].count).toBe(18);
      expect(result[2].count).toBe(15);
    });

    it('should return time window breakdown for hour granularity', async () => {
      const mockResult = {
        rows: [
          { time_bucket: new Date('2025-01-01T10:00:00Z'), count: '5' },
          { time_bucket: new Date('2025-01-01T11:00:00Z'), count: '8' },
        ],
      };

      mockQueryResponse("DATE_TRUNC('hour'", mockResult);

      const result = await repository.getSubmissionsByTimeWindow(
        '123e4567-e89b-42d3-a456-426614174000',
        'hour',
        null
      );

      expect(result).toHaveLength(2);
      expect(result[0].timeBucket).toBe('2025-01-01T10:00:00.000Z');
      expect(result[1].timeBucket).toBe('2025-01-01T11:00:00.000Z');
    });

    it('should return time window breakdown for week granularity', async () => {
      const mockResult = {
        rows: [
          { time_bucket: new Date('2024-12-30T00:00:00Z'), count: '45' },
          { time_bucket: new Date('2025-01-06T00:00:00Z'), count: '52' },
        ],
      };

      mockQueryResponse("DATE_TRUNC('week'", mockResult);

      const result = await repository.getSubmissionsByTimeWindow(
        '123e4567-e89b-42d3-a456-426614174000',
        'week',
        null
      );

      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(45);
      expect(result[1].count).toBe(52);
    });

    it('should throw error for invalid granularity', async () => {
      await expect(
        repository.getSubmissionsByTimeWindow(
          '123e4567-e89b-42d3-a456-426614174000',
          'invalid' as any,
          null
        )
      ).rejects.toThrow('Invalid granularity: invalid');
    });

    it('should return empty array when no submissions exist', async () => {
      const mockResult = { rows: [] };

      mockQueryResponse('DATE(fs.submitted_at) as time_bucket', mockResult);

      const result = await repository.getSubmissionsByTimeWindow(
        '123e4567-e89b-42d3-a456-426614174000',
        'day',
        null
      );

      expect(result).toEqual([]);
    });

    it('should include tenant filter when tenantId provided', async () => {
      const mockResult = {
        rows: [{ time_bucket: '2025-01-01', count: '10' }],
      };

      mockQueryResponse('DATE(fs.submitted_at) as time_bucket', mockResult);

      await repository.getSubmissionsByTimeWindow(
        '123e4567-e89b-42d3-a456-426614174000',
        'day',
        'tenant-abc'
      );

      const history = getQueryHistory();
      expect(history[0].query).toContain('fsch.tenant_id = $2');
      expect(history[0].values).toEqual([
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-abc',
      ]);
    });

    it('should order results by time bucket ascending', async () => {
      const mockResult = {
        rows: [
          { time_bucket: '2025-01-01', count: '12' },
          { time_bucket: '2025-01-02', count: '18' },
          { time_bucket: '2025-01-03', count: '15' },
        ],
      };

      mockQueryResponse('DATE(fs.submitted_at) as time_bucket', mockResult);

      await repository.getSubmissionsByTimeWindow(
        '123e4567-e89b-42d3-a456-426614174000',
        'day',
        null
      );

      const history = getQueryHistory();
      expect(history[0].query).toContain('ORDER BY time_bucket ASC');
    });

    it('should handle query errors and rethrow with context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockQueryError(new Error('Invalid date format'));

      await expect(
        repository.getSubmissionsByTimeWindow(
          '123e4567-e89b-42d3-a456-426614174000',
          'day',
          null
        )
      ).rejects.toThrow('Failed to fetch time window data: Invalid date format');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllSubmissionValues', () => {
    it('should return all submission JSONB values', async () => {
      const mockResult = {
        rows: [
          { values_json: { poll_option: 'Option A', comment: 'Great!' } },
          { values_json: { poll_option: 'Option B', comment: 'Good' } },
          { values_json: { poll_option: 'Option A', comment: 'Nice' } },
        ],
      };

      mockQueryResponse('SELECT fs.values_json', mockResult);

      const result = await repository.getAllSubmissionValues(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ poll_option: 'Option A', comment: 'Great!' });
      expect(result[1].poll_option).toBe('Option B');
      expect(result[2].poll_option).toBe('Option A');
    });

    it('should return empty array when no submissions exist', async () => {
      const mockResult = { rows: [] };

      mockQueryResponse('SELECT fs.values_json', mockResult);

      const result = await repository.getAllSubmissionValues(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(result).toEqual([]);
    });

    it('should include tenant filter when tenantId provided', async () => {
      const mockResult = {
        rows: [{ values_json: { field: 'value' } }],
      };

      mockQueryResponse('SELECT fs.values_json', mockResult);

      await repository.getAllSubmissionValues(
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-xyz'
      );

      const history = getQueryHistory();
      expect(history[0].query).toContain('fsch.tenant_id = $2');
      expect(history[0].values).toEqual([
        '123e4567-e89b-42d3-a456-426614174000',
        'tenant-xyz',
      ]);
    });

    it('should order results by submitted_at descending', async () => {
      const mockResult = {
        rows: [
          { values_json: { timestamp: '2025-01-15' } },
          { values_json: { timestamp: '2025-01-14' } },
        ],
      };

      mockQueryResponse('SELECT fs.values_json', mockResult);

      await repository.getAllSubmissionValues(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      const history = getQueryHistory();
      expect(history[0].query).toContain('ORDER BY fs.submitted_at DESC');
    });

    it('should handle query errors and rethrow with context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockQueryError(new Error('Table not found'));

      await expect(
        repository.getAllSubmissionValues(
          '123e4567-e89b-42d3-a456-426614174000',
          null
        )
      ).rejects.toThrow('Failed to fetch submission values: Table not found');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle complex JSONB objects', async () => {
      const mockResult = {
        rows: [
          {
            values_json: {
              nested: { deep: { value: 'test' } },
              array: [1, 2, 3],
              boolean: true,
              null_value: null,
            },
          },
        ],
      };

      mockQueryResponse('SELECT fs.values_json', mockResult);

      const result = await repository.getAllSubmissionValues(
        '123e4567-e89b-42d3-a456-426614174000',
        null
      );

      expect(result[0].nested.deep.value).toBe('test');
      expect(result[0].array).toEqual([1, 2, 3]);
      expect(result[0].boolean).toBe(true);
      expect(result[0].null_value).toBeNull();
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      const { analyticsRepository: singleton } = require('../../../src/repositories/analytics.repository');

      expect(singleton).toBeInstanceOf(AnalyticsRepository);
    });

    it('should reuse same instance across imports', () => {
      // Clear require cache to simulate separate imports
      delete require.cache[
        require.resolve('../../../src/repositories/analytics.repository')
      ];

      const { analyticsRepository: instance1 } = require('../../../src/repositories/analytics.repository');

      delete require.cache[
        require.resolve('../../../src/repositories/analytics.repository')
      ];

      const { analyticsRepository: instance2 } = require('../../../src/repositories/analytics.repository');

      // Both imports should return the same instance
      expect(instance1).toBe(instance2);
    });
  });
});
