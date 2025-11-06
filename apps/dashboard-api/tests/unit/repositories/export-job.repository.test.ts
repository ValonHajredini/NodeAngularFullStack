/**
 * Unit tests for ExportJobRepository
 * Epic 33.1: Export Core Infrastructure
 * Story: 33.1.2 - Export Jobs Database Schema (Task 8)
 *
 * Tests repository CRUD operations, query methods, and error handling.
 * Achieves ≥90% test coverage target.
 */

import { ExportJobRepository } from '../../../src/repositories/export-job.repository';
import {
  ExportJobStatus,
  CreateExportJobDto,
  UpdateExportJobDto,
} from '@nodeangularfullstack/shared';

// Mock database config to return mocked pool
jest.mock('../../../src/config/database.config', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

describe('ExportJobRepository', () => {
  let repository: ExportJobRepository;
  let mockPool: any;

  const mockJobRow = {
    job_id: 'job-uuid-123',
    tool_id: 'tool-uuid-456',
    user_id: 'user-uuid-789',
    status: 'pending',
    steps_completed: 0,
    steps_total: 8,
    current_step: 'Initializing...',
    progress_percentage: 0,
    package_path: null,
    package_size_bytes: null,
    error_message: null,
    created_at: new Date('2025-01-01T10:00:00Z'),
    updated_at: new Date('2025-01-01T10:00:00Z'),
    started_at: null,
    completed_at: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get mocked pool from database config
    const dbConfig = await import('../../../src/config/database.config');
    mockPool = dbConfig.pool;

    // Create repository instance
    repository = new ExportJobRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create new export job with all fields', async () => {
      const jobData: CreateExportJobDto = {
        jobId: 'job-uuid-123',
        toolId: 'tool-uuid-456',
        userId: 'user-uuid-789',
        status: ExportJobStatus.PENDING,
        stepsCompleted: 0,
        stepsTotal: 8,
        currentStep: 'Initializing...',
      };

      mockPool.query.mockResolvedValue({ rows: [mockJobRow] } as any);

      const result = await repository.create(jobData);

      expect(result.jobId).toBe('job-uuid-123');
      expect(result.toolId).toBe('tool-uuid-456');
      expect(result.userId).toBe('user-uuid-789');
      expect(result.status).toBe(ExportJobStatus.PENDING);
      expect(result.stepsTotal).toBe(8);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO export_jobs'),
        [
          'job-uuid-123',
          'tool-uuid-456',
          'user-uuid-789',
          ExportJobStatus.PENDING,
          0,
          8,
          'Initializing...',
        ]
      );
    });

    it('should create job with default values when optional fields omitted', async () => {
      const jobData: CreateExportJobDto = {
        jobId: 'job-uuid-123',
        toolId: 'tool-uuid-456',
        userId: 'user-uuid-789',
      };

      mockPool.query.mockResolvedValue({ rows: [mockJobRow] } as any);

      await repository.create(jobData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'job-uuid-123',
          'tool-uuid-456',
          'user-uuid-789',
          ExportJobStatus.PENDING, // Default status
          0, // Default stepsCompleted
          0, // Default stepsTotal
          null, // Default currentStep
        ])
      );
    });

    it('should throw error for invalid tool_id (foreign key constraint)', async () => {
      const jobData: CreateExportJobDto = {
        jobId: 'job-uuid-123',
        toolId: 'invalid-tool-id',
        userId: 'user-uuid-789',
      };

      const dbError = new Error('violates foreign key constraint');
      (dbError as any).code = '23503'; // PostgreSQL foreign key violation
      mockPool.query.mockRejectedValue(dbError);

      await expect(repository.create(jobData)).rejects.toThrow(
        'violates foreign key constraint'
      );
    });

    it('should throw error for invalid user_id (foreign key constraint)', async () => {
      const jobData: CreateExportJobDto = {
        jobId: 'job-uuid-123',
        toolId: 'tool-uuid-456',
        userId: 'invalid-user-id',
      };

      const dbError = new Error('violates foreign key constraint');
      (dbError as any).code = '23503';
      mockPool.query.mockRejectedValue(dbError);

      await expect(repository.create(jobData)).rejects.toThrow(
        'violates foreign key constraint'
      );
    });

    it('should throw error for duplicate job_id (primary key constraint)', async () => {
      const jobData: CreateExportJobDto = {
        jobId: 'existing-job-id',
        toolId: 'tool-uuid-456',
        userId: 'user-uuid-789',
      };

      const dbError = new Error(
        'duplicate key value violates unique constraint'
      );
      (dbError as any).code = '23505'; // PostgreSQL unique violation
      mockPool.query.mockRejectedValue(dbError);

      await expect(repository.create(jobData)).rejects.toThrow(
        'duplicate key value violates unique constraint'
      );
    });
  });

  describe('findById', () => {
    it('should retrieve export job by ID', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockJobRow] } as any);

      const result = await repository.findById('job-uuid-123');

      expect(result).not.toBeNull();
      expect(result?.jobId).toBe('job-uuid-123');
      expect(result?.toolId).toBe('tool-uuid-456');
      expect(result?.status).toBe(ExportJobStatus.PENDING);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM export_jobs WHERE job_id = $1',
        ['job-uuid-123']
      );
    });

    it('should return null for non-existent job', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findById('non-existent-job');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM export_jobs WHERE job_id = $1',
        ['non-existent-job']
      );
    });

    it('should map database row to ExportJob interface correctly', async () => {
      const rowWithBigInt = {
        ...mockJobRow,
        package_path: '/exports/job-123.tar.gz',
        package_size_bytes: '1048576', // PostgreSQL BIGINT as string
      };

      mockPool.query.mockResolvedValue({ rows: [rowWithBigInt] } as any);

      const result = await repository.findById('job-uuid-123');

      expect(result?.packagePath).toBe('/exports/job-123.tar.gz');
      expect(result?.packageSizeBytes).toBe(1048576); // Converted to number
    });

    it('should throw error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection error'));

      await expect(repository.findById('job-uuid-123')).rejects.toThrow(
        'Database connection error'
      );
    });
  });

  describe('update', () => {
    it('should update job status and progress', async () => {
      const updates: UpdateExportJobDto = {
        status: ExportJobStatus.IN_PROGRESS,
        stepsCompleted: 3,
        progressPercentage: 37,
        currentStep: 'Generating boilerplate...',
      };

      const updatedRow = {
        ...mockJobRow,
        status: 'in_progress',
        steps_completed: 3,
        progress_percentage: 37,
        current_step: 'Generating boilerplate...',
      };

      mockPool.query.mockResolvedValue({ rows: [updatedRow] } as any);

      const result = await repository.update('job-uuid-123', updates);

      expect(result.status).toBe(ExportJobStatus.IN_PROGRESS);
      expect(result.stepsCompleted).toBe(3);
      expect(result.progressPercentage).toBe(37);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE export_jobs'),
        expect.arrayContaining([
          3,
          37,
          'Generating boilerplate...',
          'job-uuid-123',
        ])
      );
    });

    it('should update only provided fields (partial update)', async () => {
      const updates: UpdateExportJobDto = {
        stepsCompleted: 5,
      };

      const updatedRow = {
        ...mockJobRow,
        steps_completed: 5,
      };

      mockPool.query.mockResolvedValue({ rows: [updatedRow] } as any);

      await repository.update('job-uuid-123', updates);

      // Should only update steps_completed and updated_at
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.arrayContaining([5, 'job-uuid-123'])
      );
    });

    it('should update completion fields when job completes', async () => {
      const completionDate = new Date('2025-01-01T11:00:00Z');
      const updates: UpdateExportJobDto = {
        status: ExportJobStatus.COMPLETED,
        stepsCompleted: 8,
        progressPercentage: 100,
        packagePath: '/exports/job-123.tar.gz',
        packageSizeBytes: 2048000,
        completedAt: completionDate,
      };

      const completedRow = {
        ...mockJobRow,
        status: 'completed',
        steps_completed: 8,
        progress_percentage: 100,
        package_path: '/exports/job-123.tar.gz',
        package_size_bytes: '2048000',
        completed_at: completionDate,
      };

      mockPool.query.mockResolvedValue({ rows: [completedRow] } as any);

      const result = await repository.update('job-uuid-123', updates);

      expect(result.status).toBe(ExportJobStatus.COMPLETED);
      expect(result.packagePath).toBe('/exports/job-123.tar.gz');
      expect(result.packageSizeBytes).toBe(2048000);
      expect(result.completedAt).toEqual(completionDate);
    });

    it('should update error message when job fails', async () => {
      const updates: UpdateExportJobDto = {
        status: ExportJobStatus.FAILED,
        errorMessage: 'Database connection timeout',
      };

      const failedRow = {
        ...mockJobRow,
        status: 'failed',
        error_message: 'Database connection timeout',
      };

      mockPool.query.mockResolvedValue({ rows: [failedRow] } as any);

      const result = await repository.update('job-uuid-123', updates);

      expect(result.status).toBe(ExportJobStatus.FAILED);
      expect(result.errorMessage).toBe('Database connection timeout');
    });

    it('should throw error when job not found', async () => {
      const updates: UpdateExportJobDto = {
        status: ExportJobStatus.IN_PROGRESS,
      };

      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await expect(
        repository.update('non-existent-job', updates)
      ).rejects.toThrow('Export job not found: non-existent-job');
    });
  });

  describe('findByUserId', () => {
    it('should return user export jobs sorted by created_at DESC', async () => {
      const mockRows = [
        { ...mockJobRow, created_at: new Date('2025-01-02') },
        { ...mockJobRow, created_at: new Date('2025-01-01') },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.findByUserId('user-uuid-789');

      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['user-uuid-789', 50] // Default limit 50
      );
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await repository.findByUserId('user-uuid-789', 10);

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [
        'user-uuid-789',
        10,
      ]);
    });

    it('should return empty array when user has no jobs', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findByUserId('user-uuid-789');

      expect(result).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return jobs with matching status sorted by created_at ASC', async () => {
      const mockRows = [
        { ...mockJobRow, status: 'pending' },
        { ...mockJobRow, status: 'pending', job_id: 'job-2' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.findByStatus(ExportJobStatus.PENDING);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(ExportJobStatus.PENDING);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        ['pending']
      );
    });

    it('should return empty array when no jobs match status', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findByStatus(ExportJobStatus.COMPLETED);

      expect(result).toEqual([]);
    });

    it('should filter by IN_PROGRESS status', async () => {
      const mockRows = [{ ...mockJobRow, status: 'in_progress' }];
      mockPool.query.mockResolvedValue({ rows: mockRows } as any);

      await repository.findByStatus(ExportJobStatus.IN_PROGRESS);

      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [
        'in_progress',
      ]);
    });
  });

  describe('findByToolId', () => {
    it('should return export jobs for specific tool', async () => {
      const mockRows = [mockJobRow, { ...mockJobRow, job_id: 'job-2' }];

      mockPool.query.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.findByToolId('tool-uuid-456');

      expect(result).toHaveLength(2);
      expect(result[0].toolId).toBe('tool-uuid-456');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tool_id = $1'),
        ['tool-uuid-456']
      );
    });

    it('should return empty array when tool has no export jobs', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findByToolId('tool-uuid-999');

      expect(result).toEqual([]);
    });
  });

  describe('deleteOldJobs', () => {
    it('should delete completed jobs older than retention period', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 5 } as any);

      const deletedCount = await repository.deleteOldJobs(30);

      expect(deletedCount).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_at < NOW() - INTERVAL $1'),
        ['30 days']
      );
    });

    it('should only delete terminal status jobs (completed, failed, cancelled, rolled_back)', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 3 } as any);

      await repository.deleteOldJobs(30);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "status IN ('completed', 'failed', 'cancelled', 'rolled_back')"
        ),
        ['30 days']
      );
    });

    it('should not delete in_progress or pending jobs', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 } as any);

      await repository.deleteOldJobs(30);

      const callArg = mockPool.query.mock.calls[0][0];
      expect(callArg).not.toContain("'in_progress'");
      expect(callArg).not.toContain("'pending'");
    });

    it('should return 0 when no jobs deleted', async () => {
      mockPool.query.mockResolvedValue({ rowCount: null } as any);

      const deletedCount = await repository.deleteOldJobs(90);

      expect(deletedCount).toBe(0);
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 2 } as any);

      await repository.deleteOldJobs(30);

      // Verify parameterized query (not string interpolation)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INTERVAL $1'),
        ['30 days']
      );
      expect(mockPool.query).not.toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'"),
        expect.anything()
      );
    });
  });

  describe('delete', () => {
    it('should delete export job by ID', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 } as any);

      const deleted = await repository.delete('job-uuid-123');

      expect(deleted).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM export_jobs WHERE job_id = $1',
        ['job-uuid-123']
      );
    });

    it('should return false when job not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 } as any);

      const deleted = await repository.delete('non-existent-job');

      expect(deleted).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      mockPool.query.mockResolvedValue({ rowCount: null } as any);

      const deleted = await repository.delete('job-uuid-123');

      expect(deleted).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null user_id when user deleted', async () => {
      const rowWithNullUser = {
        ...mockJobRow,
        user_id: null,
      };

      mockPool.query.mockResolvedValue({ rows: [rowWithNullUser] } as any);

      const result = await repository.findById('job-uuid-123');

      expect(result?.userId).toBeNull();
    });

    it('should handle null package_size_bytes', async () => {
      const rowWithNullSize = {
        ...mockJobRow,
        package_size_bytes: null,
      };

      mockPool.query.mockResolvedValue({ rows: [rowWithNullSize] } as any);

      const result = await repository.findById('job-uuid-123');

      expect(result?.packageSizeBytes).toBeNull();
    });

    it('should handle large package_size_bytes (BIGINT)', async () => {
      const rowWithLargeSize = {
        ...mockJobRow,
        package_size_bytes: '9999999999', // 9GB+ as string
      };

      mockPool.query.mockResolvedValue({ rows: [rowWithLargeSize] } as any);

      const result = await repository.findById('job-uuid-123');

      expect(result?.packageSizeBytes).toBe(9999999999);
    });

    it('should handle database connection errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(repository.findById('job-uuid-123')).rejects.toThrow(
        'ECONNREFUSED'
      );
    });

    it('should handle unexpected database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Unexpected database error'));

      await expect(
        repository.create({
          jobId: 'job-123',
          toolId: 'tool-456',
          userId: 'user-789',
        })
      ).rejects.toThrow('Unexpected database error');
    });
  });
});
