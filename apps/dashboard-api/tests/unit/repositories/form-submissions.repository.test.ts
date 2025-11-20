import { FormSubmissionsRepository } from '../../../src/repositories/form-submissions.repository';
import { FormSubmission } from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('FormSubmissionsRepository', () => {
  let repository: FormSubmissionsRepository;
  let mockClient: any;
  let mockPool: any;

  const mockSubmission: FormSubmission = {
    id: 'submission-123',
    formSchemaId: 'schema-123',
    values: { name: 'John Doe', email: 'john@example.com' },
    submittedAt: new Date('2025-01-01'),
    submitterIp: '192.168.1.1',
    userId: 'user-123',
    metadata: { browser: 'Chrome', os: 'macOS' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (databaseService.getPool as jest.Mock).mockReturnValue(mockPool);

    repository = new FormSubmissionsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a form submission successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockSubmission] });

      const submissionData = {
        formSchemaId: 'schema-123',
        values: { name: 'John Doe', email: 'john@example.com' },
        submitterIp: '192.168.1.1',
        userId: 'user-123',
        metadata: { browser: 'Chrome', os: 'macOS' },
      };

      const result = await repository.create(submissionData);

      expect(result).toEqual(mockSubmission);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO form_submissions'),
        expect.arrayContaining([
          'schema-123',
          JSON.stringify(submissionData.values),
          '192.168.1.1',
          'user-123',
          JSON.stringify(submissionData.metadata),
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create submission without userId and metadata', async () => {
      const submissionWithoutOptional = {
        ...mockSubmission,
        userId: undefined,
        metadata: undefined,
      };
      mockClient.query.mockResolvedValue({
        rows: [submissionWithoutOptional],
      });

      const submissionData = {
        formSchemaId: 'schema-123',
        values: { name: 'Anonymous' },
        submitterIp: '192.168.1.1',
      };

      const result = await repository.create(submissionData);

      expect(result).toEqual(submissionWithoutOptional);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO form_submissions'),
        expect.arrayContaining([
          'schema-123',
          expect.any(String),
          '192.168.1.1',
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const submissionData = {
        formSchemaId: 'schema-123',
        values: { name: 'Test' },
        submitterIp: '192.168.1.1',
      };

      await expect(repository.create(submissionData)).rejects.toThrow(
        'Failed to create form submission'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when creation returns no rows', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const submissionData = {
        formSchemaId: 'schema-123',
        values: { name: 'Test' },
        submitterIp: '192.168.1.1',
      };

      await expect(repository.create(submissionData)).rejects.toThrow(
        'Failed to create form submission'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByFormSchemaId', () => {
    it('should find submissions by schema ID without limit', async () => {
      const mockSubmissions = [
        mockSubmission,
        { ...mockSubmission, id: 'submission-456' },
      ];
      mockClient.query.mockResolvedValue({ rows: mockSubmissions });

      const result = await repository.findByFormSchemaId('schema-123');

      expect(result).toEqual(mockSubmissions);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE form_schema_id = $1'),
        ['schema-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY submitted_at DESC'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should find submissions by schema ID with limit', async () => {
      const mockSubmissions = [mockSubmission];
      mockClient.query.mockResolvedValue({ rows: mockSubmissions });

      const result = await repository.findByFormSchemaId('schema-123', 10);

      expect(result).toEqual(mockSubmissions);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['schema-123', 10]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no submissions found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByFormSchemaId('schema-123');

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByFormSchemaId('schema-123')).rejects.toThrow(
        'Failed to find submissions by schema ID'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByFormId', () => {
    it('should find all submissions for a form across versions', async () => {
      const mockSubmissions = [
        mockSubmission,
        { ...mockSubmission, id: 'submission-456', formSchemaId: 'schema-456' },
      ];
      mockClient.query.mockResolvedValue({ rows: mockSubmissions });

      const result = await repository.findByFormId('form-123');

      expect(result).toEqual(mockSubmissions);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN form_schemas'),
        ['form-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE fsch.form_id = $1'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY fs.submitted_at DESC'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no submissions found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByFormId('form-123');

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByFormId('form-123')).rejects.toThrow(
        'Failed to find submissions by form ID'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('countByFormSchemaId', () => {
    it('should count submissions for a schema', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await repository.countByFormSchemaId('schema-123');

      expect(result).toBe(42);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        ['schema-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE form_schema_id = $1'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 0 when no submissions found', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await repository.countByFormSchemaId('schema-123');

      expect(result).toBe(0);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.countByFormSchemaId('schema-123')
      ).rejects.toThrow('Failed to count submissions by schema ID');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
