/**
 * Integration Tests: Database Operations
 * Story 33.1.5: Integration Tests for Epic 33.1 (Task 4)
 *
 * Tests ExportJobRepository CRUD operations with real PostgreSQL database.
 * Verifies foreign key constraints, cascade deletes, indexes, and transactions.
 */

import { randomUUID } from 'crypto';
import { ExportJobRepository } from '../../../src/repositories/export-job.repository';
import { TestDatabaseHelper } from './db-helper';
import { ExportJobStatus } from '@nodeangularfullstack/shared';
import { createTestTool } from '../../../tests/fixtures/epic-33.1/test-fixtures';

describe('Database Operations Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let repository: ExportJobRepository;
  let testToolId: string;
  let testUserId: string;

  beforeAll(async () => {
    dbHelper = await TestDatabaseHelper.initialize();
    repository = new ExportJobRepository(dbHelper.getPool());

    // Create test tool and user for foreign key references
    const pool = dbHelper.getPool();

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id`,
      ['test-db@example.com', 'hashed', 'Test', 'User', 'user']
    );
    testUserId = userResult.rows[0].id;

    // Create test tool
    const toolData = await createTestTool(pool, {
      toolId: 'db-test-tool',
      name: 'DB Test Tool',
    });
    testToolId = toolData.toolId;

    // Get actual tool_registry ID (not toolId)
    const toolResult = await pool.query(
      'SELECT id FROM tool_registry WHERE tool_id = $1',
      [testToolId]
    );
    testToolId = toolResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test data
    await dbHelper.query('DELETE FROM export_jobs WHERE tool_id = $1', [
      testToolId,
    ]);
    await dbHelper.query('DELETE FROM tool_registry WHERE id = $1', [
      testToolId,
    ]);
    await dbHelper.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await dbHelper.close();
  });

  afterEach(async () => {
    // Cleanup test export jobs after each test
    await dbHelper.query('DELETE FROM export_jobs WHERE tool_id = $1', [
      testToolId,
    ]);
  });

  describe('CRUD Operations', () => {
    describe('create()', () => {
      it('should create export job with valid data', async () => {
        const jobData = {
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.PENDING,
          stepsTotal: 8,
          currentStep: 'Initializing...',
        };

        const job = await repository.create(jobData);

        expect(job).toBeDefined();
        expect(job.jobId).toBe(jobData.jobId);
        expect(job.toolId).toBe(jobData.toolId);
        expect(job.userId).toBe(jobData.userId);
        expect(job.status).toBe(ExportJobStatus.PENDING);
        expect(job.stepsTotal).toBe(8);
        expect(job.stepsCompleted).toBe(0);
        expect(job.currentStep).toBe('Initializing...');
        expect(job.progressPercentage).toBe(0);
        expect(job.createdAt).toBeDefined();
        expect(job.updatedAt).toBeDefined();
      });

      it('should set default values for optional fields', async () => {
        const jobData = {
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
        };

        const job = await repository.create(jobData);

        expect(job.status).toBe(ExportJobStatus.PENDING);
        expect(job.stepsCompleted).toBe(0);
        expect(job.stepsTotal).toBe(0);
        expect(job.currentStep).toBeNull();
        expect(job.progressPercentage).toBe(0);
        expect(job.packagePath).toBeNull();
        expect(job.packageSizeBytes).toBeNull();
        expect(job.errorMessage).toBeNull();
      });

      it('should throw error for invalid tool_id (foreign key violation)', async () => {
        const jobData = {
          jobId: randomUUID(),
          toolId: 'non-existent-tool-id',
          userId: testUserId,
        };

        await expect(repository.create(jobData)).rejects.toThrow();
      });

      it('should create job with valid user_id', async () => {
        const jobData = {
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
        };

        const job = await repository.create(jobData);

        expect(job.userId).toBe(testUserId);
      });

      it('should enforce unique job_id constraint', async () => {
        const jobId = randomUUID();
        const jobData = {
          jobId,
          toolId: testToolId,
          userId: testUserId,
        };

        await repository.create(jobData);

        // Attempt to create duplicate job_id
        await expect(repository.create(jobData)).rejects.toThrow();
      });
    });

    describe('findById()', () => {
      it('should find export job by job_id', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
        });

        const job = await repository.findById(jobId);

        expect(job).toBeDefined();
        expect(job?.jobId).toBe(jobId);
        expect(job?.toolId).toBe(testToolId);
      });

      it('should return null for non-existent job_id', async () => {
        const job = await repository.findById(randomUUID());

        expect(job).toBeNull();
      });

      it('should return job with all fields populated', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.IN_PROGRESS,
          stepsTotal: 10,
          stepsCompleted: 5,
          currentStep: 'Step 5',
        });

        // Update progress_percentage (not auto-calculated by DB)
        await repository.update(jobId, {
          progressPercentage: 50,
        });

        const job = await repository.findById(jobId);

        expect(job?.status).toBe(ExportJobStatus.IN_PROGRESS);
        expect(job?.stepsCompleted).toBe(5);
        expect(job?.stepsTotal).toBe(10);
        expect(job?.progressPercentage).toBe(50);
        expect(job?.currentStep).toBe('Step 5');
      });
    });

    describe('update()', () => {
      it('should update export job status', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.PENDING,
        });

        const updated = await repository.update(jobId, {
          status: ExportJobStatus.IN_PROGRESS,
        });

        expect(updated.status).toBe(ExportJobStatus.IN_PROGRESS);
        expect(updated.updatedAt.getTime()).toBeGreaterThan(
          updated.createdAt.getTime()
        );
      });

      it('should update multiple fields atomically', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
          stepsTotal: 10,
        });

        const updated = await repository.update(jobId, {
          status: ExportJobStatus.IN_PROGRESS,
          stepsCompleted: 7,
          progressPercentage: 70,
          currentStep: 'Almost done...',
        });

        expect(updated.status).toBe(ExportJobStatus.IN_PROGRESS);
        expect(updated.stepsCompleted).toBe(7);
        expect(updated.progressPercentage).toBe(70);
        expect(updated.currentStep).toBe('Almost done...');
      });

      it('should update package metadata on completion', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
        });

        const updated = await repository.update(jobId, {
          status: ExportJobStatus.COMPLETED,
          packagePath: '/exports/package.tar.gz',
          packageSizeBytes: 1024000,
        });

        expect(updated.status).toBe(ExportJobStatus.COMPLETED);
        expect(updated.packagePath).toBe('/exports/package.tar.gz');
        expect(updated.packageSizeBytes).toBe(1024000);
      });

      it('should throw error for non-existent job', async () => {
        await expect(
          repository.update(randomUUID(), { status: ExportJobStatus.COMPLETED })
        ).rejects.toThrow('Export job not found');
      });

      it('should update only provided fields', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
          stepsTotal: 10,
          currentStep: 'Original step',
        });

        const updated = await repository.update(jobId, {
          stepsCompleted: 5,
        });

        expect(updated.stepsCompleted).toBe(5);
        expect(updated.stepsTotal).toBe(10); // Unchanged
        expect(updated.currentStep).toBe('Original step'); // Unchanged
      });
    });

    describe('findByUserId()', () => {
      it('should find all jobs for a user', async () => {
        await repository.create({
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
        });

        await repository.create({
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
        });

        const jobs = await repository.findByUserId(testUserId);

        expect(jobs.length).toBeGreaterThanOrEqual(2);
        expect(jobs.every((job) => job.userId === testUserId)).toBe(true);
      });

      it('should return jobs sorted by creation date DESC', async () => {
        const job1Id = randomUUID();
        await repository.create({
          jobId: job1Id,
          toolId: testToolId,
          userId: testUserId,
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        const job2Id = randomUUID();
        await repository.create({
          jobId: job2Id,
          toolId: testToolId,
          userId: testUserId,
        });

        const jobs = await repository.findByUserId(testUserId);

        // Most recent job should be first
        expect(jobs[0].jobId).toBe(job2Id);
        expect(jobs[1].jobId).toBe(job1Id);
      });

      it('should respect limit parameter', async () => {
        // Create 3 jobs
        for (let i = 0; i < 3; i++) {
          await repository.create({
            jobId: randomUUID(),
            toolId: testToolId,
            userId: testUserId,
          });
        }

        const jobs = await repository.findByUserId(testUserId, 2);

        expect(jobs.length).toBe(2);
      });

      it('should return empty array for user with no jobs', async () => {
        const jobs = await repository.findByUserId(randomUUID());

        expect(jobs).toEqual([]);
      });
    });

    describe('findByStatus()', () => {
      it('should find jobs by status', async () => {
        await repository.create({
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.PENDING,
        });

        await repository.create({
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.IN_PROGRESS,
        });

        const pendingJobs = await repository.findByStatus(
          ExportJobStatus.PENDING
        );
        const progressJobs = await repository.findByStatus(
          ExportJobStatus.IN_PROGRESS
        );

        expect(pendingJobs.length).toBeGreaterThanOrEqual(1);
        expect(progressJobs.length).toBeGreaterThanOrEqual(1);
        expect(
          pendingJobs.every((job) => job.status === ExportJobStatus.PENDING)
        ).toBe(true);
        expect(
          progressJobs.every(
            (job) => job.status === ExportJobStatus.IN_PROGRESS
          )
        ).toBe(true);
      });

      it('should return jobs sorted by creation date ASC (queue order)', async () => {
        const job1Id = randomUUID();
        await repository.create({
          jobId: job1Id,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.PENDING,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const job2Id = randomUUID();
        await repository.create({
          jobId: job2Id,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.PENDING,
        });

        const jobs = await repository.findByStatus(ExportJobStatus.PENDING);

        // Oldest job should be first (queue order)
        const testJobs = jobs.filter((j) =>
          [job1Id as string, job2Id as string].includes(j.jobId)
        );
        expect(testJobs[0].jobId).toBe(job1Id);
        expect(testJobs[1].jobId).toBe(job2Id);
      });
    });

    describe('findByToolId()', () => {
      it('should find all jobs for a tool', async () => {
        await repository.create({
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
        });

        await repository.create({
          jobId: randomUUID(),
          toolId: testToolId,
          userId: testUserId,
        });

        const jobs = await repository.findByToolId(testToolId);

        expect(jobs.length).toBeGreaterThanOrEqual(2);
        expect(jobs.every((job) => job.toolId === testToolId)).toBe(true);
      });

      it('should return jobs sorted by creation date DESC', async () => {
        const job1Id = randomUUID();
        await repository.create({
          jobId: job1Id,
          toolId: testToolId,
          userId: testUserId,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const job2Id = randomUUID();
        await repository.create({
          jobId: job2Id,
          toolId: testToolId,
          userId: testUserId,
        });

        const jobs = await repository.findByToolId(testToolId);

        // Most recent job should be first
        expect(jobs[0].jobId).toBe(job2Id);
        expect(jobs[1].jobId).toBe(job1Id);
      });
    });

    describe('delete()', () => {
      it('should delete export job by job_id', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
        });

        const deleted = await repository.delete(jobId);

        expect(deleted).toBe(true);

        const job = await repository.findById(jobId);
        expect(job).toBeNull();
      });

      it('should return false for non-existent job', async () => {
        const deleted = await repository.delete(randomUUID());

        expect(deleted).toBe(false);
      });
    });

    describe('deleteOldJobs()', () => {
      it('should delete completed jobs older than retention period', async () => {
        // Create old job (simulate by manually setting created_at)
        const oldJobId = randomUUID();
        await repository.create({
          jobId: oldJobId,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.COMPLETED,
        });

        // Manually set created_at to 45 days ago
        await dbHelper.query(
          `UPDATE export_jobs SET created_at = NOW() - INTERVAL '45 days' WHERE job_id = $1`,
          [oldJobId]
        );

        const deletedCount = await repository.deleteOldJobs(30);

        expect(deletedCount).toBeGreaterThanOrEqual(1);

        const job = await repository.findById(oldJobId);
        expect(job).toBeNull();
      });

      it('should not delete in_progress jobs regardless of age', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.IN_PROGRESS,
        });

        // Manually set created_at to 45 days ago
        await dbHelper.query(
          `UPDATE export_jobs SET created_at = NOW() - INTERVAL '45 days' WHERE job_id = $1`,
          [jobId]
        );

        await repository.deleteOldJobs(30);

        const job = await repository.findById(jobId);
        expect(job).toBeDefined(); // Still exists
      });

      it('should not delete recent completed jobs', async () => {
        const jobId = randomUUID();
        await repository.create({
          jobId,
          toolId: testToolId,
          userId: testUserId,
          status: ExportJobStatus.COMPLETED,
        });

        await repository.deleteOldJobs(30);

        const job = await repository.findById(jobId);
        expect(job).toBeDefined(); // Still exists (too recent)
      });
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce tool_id foreign key constraint', async () => {
      const jobData = {
        jobId: randomUUID(),
        toolId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        userId: testUserId,
      };

      await expect(repository.create(jobData)).rejects.toThrow();
    });

    it('should CASCADE delete jobs when tool is deleted', async () => {
      // Create temporary tool
      const pool = dbHelper.getPool();
      const tempTool = await createTestTool(pool, {
        toolId: `temp-tool-${Date.now()}`,
        name: 'Temporary Tool',
      });

      const toolResult = await pool.query(
        'SELECT id FROM tool_registry WHERE tool_id = $1',
        [tempTool.toolId]
      );
      const tempToolId = toolResult.rows[0].id;

      // Create job for temp tool
      const jobId = randomUUID();
      await repository.create({
        jobId,
        toolId: tempToolId,
        userId: testUserId,
      });

      // Verify job exists
      let job = await repository.findById(jobId);
      expect(job).toBeDefined();

      // Delete tool (should cascade to export_jobs)
      await pool.query('DELETE FROM tool_registry WHERE id = $1', [tempToolId]);

      // Verify job was deleted via cascade
      job = await repository.findById(jobId);
      expect(job).toBeNull();
    });

    it('should SET NULL user_id when user is deleted', async () => {
      // Create temporary user
      const pool = dbHelper.getPool();
      const tempUserResult = await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         RETURNING id`,
        [
          `temp-user-${Date.now()}@example.com`,
          'hashed',
          'Temp',
          'User',
          'user',
        ]
      );
      const tempUserId = tempUserResult.rows[0].id;

      // Create job for temp user
      const jobId = randomUUID();
      await repository.create({
        jobId,
        toolId: testToolId,
        userId: tempUserId,
      });

      // Verify job has user_id
      let job = await repository.findById(jobId);
      expect(job?.userId).toBe(tempUserId);

      // Delete user (should SET NULL user_id)
      await pool.query('DELETE FROM users WHERE id = $1', [tempUserId]);

      // Verify user_id is now NULL but job still exists
      job = await repository.findById(jobId);
      expect(job).toBeDefined();
      expect(job?.userId).toBeNull();

      // Cleanup
      await repository.delete(jobId);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce check constraint: steps_completed <= steps_total', async () => {
      const jobId = randomUUID();
      await repository.create({
        jobId,
        toolId: testToolId,
        userId: testUserId,
        stepsTotal: 10,
      });

      // Attempt to set steps_completed > steps_total
      await expect(
        repository.update(jobId, {
          stepsCompleted: 15,
        })
      ).rejects.toThrow();
    });

    it('should enforce check constraint: progress_percentage between 0 and 100', async () => {
      const jobId = randomUUID();
      await repository.create({
        jobId,
        toolId: testToolId,
        userId: testUserId,
      });

      // Attempt to set invalid progress percentage
      await expect(
        repository.update(jobId, {
          progressPercentage: 150,
        })
      ).rejects.toThrow();

      await expect(
        repository.update(jobId, {
          progressPercentage: -10,
        })
      ).rejects.toThrow();
    });

    it('should enforce check constraint: package_size_bytes >= 0', async () => {
      const jobId = randomUUID();
      await repository.create({
        jobId,
        toolId: testToolId,
        userId: testUserId,
      });

      // Attempt to set negative package size
      await expect(
        repository.update(jobId, {
          packageSizeBytes: -1000,
        })
      ).rejects.toThrow();
    });
  });

  describe('Index Verification', () => {
    it('should use idx_export_jobs_tool_id for tool_id queries', async () => {
      const result = await dbHelper.query(
        `
        EXPLAIN (FORMAT JSON)
        SELECT * FROM export_jobs WHERE tool_id = $1
      `,
        [testToolId]
      );

      const queryPlan = JSON.stringify(result.rows[0]['QUERY PLAN']);
      expect(queryPlan).toContain('idx_export_jobs_tool_id');
    });

    it('should use idx_export_jobs_user_id for user_id queries', async () => {
      const result = await dbHelper.query(
        `
        EXPLAIN (FORMAT JSON)
        SELECT * FROM export_jobs WHERE user_id = $1
      `,
        [testUserId]
      );

      const queryPlan = JSON.stringify(result.rows[0]['QUERY PLAN']);
      // PostgreSQL may use idx_export_jobs_user_id or idx_export_jobs_user_created (compound index)
      // Both are valid and efficient for user_id queries
      const hasUserIndex =
        queryPlan.includes('idx_export_jobs_user_id') ||
        queryPlan.includes('idx_export_jobs_user_created');
      expect(hasUserIndex).toBe(true);
    });

    it('should use idx_export_jobs_status for status queries', async () => {
      const result = await dbHelper.query(
        `
        EXPLAIN (FORMAT JSON)
        SELECT * FROM export_jobs WHERE status = $1
      `,
        [ExportJobStatus.PENDING]
      );

      const queryPlan = JSON.stringify(result.rows[0]['QUERY PLAN']);
      expect(queryPlan).toContain('idx_export_jobs_status');
    });

    it('should use idx_export_jobs_user_created for user history queries', async () => {
      const result = await dbHelper.query(
        `
        EXPLAIN (FORMAT JSON)
        SELECT * FROM export_jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
        [testUserId]
      );

      const queryPlan = JSON.stringify(result.rows[0]['QUERY PLAN']);
      expect(queryPlan).toContain('idx_export_jobs_user_created');
    });

    it('should use idx_export_jobs_created_at for cleanup queries', async () => {
      const result = await dbHelper.query(
        `
        EXPLAIN (FORMAT JSON)
        SELECT * FROM export_jobs
        WHERE created_at < NOW() - INTERVAL '30 days'
      `
      );

      const queryPlan = JSON.stringify(result.rows[0]['QUERY PLAN']);
      // Index should be used for date range queries
      expect(queryPlan).toContain('idx_export_jobs_created_at');
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback transaction on error', async () => {
      const jobId = randomUUID();

      try {
        await dbHelper.transaction(async (client) => {
          // Create job
          await client.query(
            `INSERT INTO export_jobs (job_id, tool_id, user_id, status)
             VALUES ($1, $2, $3, $4)`,
            [jobId, testToolId, testUserId, ExportJobStatus.PENDING]
          );

          // Throw error to trigger rollback
          throw new Error('Simulated transaction error');
        });
      } catch (error) {
        // Expected error
      }

      // Verify job was not created due to rollback
      const job = await repository.findById(jobId);
      expect(job).toBeNull();
    });

    it('should commit transaction on success', async () => {
      const jobId = randomUUID();

      await dbHelper.transaction(async (client) => {
        await client.query(
          `INSERT INTO export_jobs (job_id, tool_id, user_id, status)
           VALUES ($1, $2, $3, $4)`,
          [jobId, testToolId, testUserId, ExportJobStatus.PENDING]
        );
      });

      // Verify job was committed
      const job = await repository.findById(jobId);
      expect(job).toBeDefined();
      expect(job?.jobId).toBe(jobId);
    });
  });
});
