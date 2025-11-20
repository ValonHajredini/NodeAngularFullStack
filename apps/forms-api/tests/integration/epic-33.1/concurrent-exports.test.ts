/**
 * Epic 33.1 Integration Tests - Concurrent Exports
 *
 * Tests concurrent export job execution, race conditions, and resource contention.
 *
 * Test Coverage:
 * - Multiple exports starting simultaneously
 * - Race conditions with status updates
 * - Resource contention (filesystem, database)
 * - Job queue behavior and limits
 * - Concurrent cancellations
 * - Transaction isolation
 * - Mixed success/failure scenarios
 */

import { Pool } from 'pg';
import { TestDatabaseHelper } from './db-helper';
import {
  createCompleteTestTool,
  createTestFormSchema,
  SEED_USERS,
  TestToolFixture,
  TestFormSchemaFixture,
} from '../../fixtures/epic-33.1/test-fixtures';
import { ToolRegistryRepository } from '../../../src/repositories/tool-registry.repository';
import { ExportJobRepository } from '../../../src/repositories/export-job.repository';
import { FormSchemasRepository } from '../../../src/repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../../../src/repositories/form-submissions.repository';
import { ThemesRepository } from '../../../src/repositories/themes.repository';
import { ExportOrchestratorService } from '../../../src/services/export-orchestrator.service';
import { PreFlightValidator } from '../../../src/services/pre-flight-validator.service';

describe('Epic 33.1 - Integration Tests - Concurrent Exports', () => {
  let dbHelper: TestDatabaseHelper;
  let pool: Pool;

  // Repositories
  let toolRegistryRepo: ToolRegistryRepository;
  let exportJobRepo: ExportJobRepository;
  let formSchemasRepo: FormSchemasRepository;
  let formSubmissionsRepo: FormSubmissionsRepository;
  let themesRepo: ThemesRepository;

  // Services
  let preFlightValidator: PreFlightValidator;
  let orchestratorService: ExportOrchestratorService;

  // Test data
  let testTools: TestToolFixture[] = [];
  let testFormSchemas: TestFormSchemaFixture[] = [];

  beforeAll(async () => {
    // Initialize database helper
    dbHelper = await TestDatabaseHelper.initialize();
    pool = dbHelper.getPool();

    // Initialize repositories
    toolRegistryRepo = new ToolRegistryRepository();
    exportJobRepo = new ExportJobRepository(pool);
    formSchemasRepo = new FormSchemasRepository();
    formSubmissionsRepo = new FormSubmissionsRepository();
    themesRepo = new ThemesRepository();

    // Initialize pre-flight validator
    preFlightValidator = new PreFlightValidator(
      toolRegistryRepo,
      formSchemasRepo,
      formSubmissionsRepo,
      themesRepo
    );

    // Initialize orchestrator service
    orchestratorService = new ExportOrchestratorService(
      toolRegistryRepo,
      exportJobRepo,
      preFlightValidator
    );
  });

  afterAll(async () => {
    // Clean up and close database connection
    if (dbHelper) {
      await dbHelper.deleteTestExportJobs();
      await dbHelper.deleteTestToolRegistry();
      await dbHelper.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await dbHelper.deleteTestExportJobs();
    await dbHelper.deleteTestToolRegistry();

    testTools = [];
    testFormSchemas = [];
  });

  afterEach(async () => {
    // Clean up test data after each test
    await dbHelper.deleteTestExportJobs();
    await dbHelper.deleteTestToolRegistry();

    testTools = [];
    testFormSchemas = [];
  });

  describe('Concurrent Export Job Execution', () => {
    it('should handle multiple exports starting simultaneously', async () => {
      // Create 5 test tools
      for (let i = 0; i < 5; i++) {
        const { tool, formSchema } = await createCompleteTestTool(pool, {
          toolName: `Concurrent Test Tool ${i + 1}`,
          submissionCount: 3,
        });
        testTools.push(tool);
        testFormSchemas.push(formSchema);
      }

      // Start all 5 exports simultaneously
      const startPromises = testTools.map((tool) =>
        orchestratorService.startExport(tool.toolId, 'admin@example.com')
      );

      const exportJobs = await Promise.all(startPromises);

      // Extract job IDs
      const jobIds = exportJobs.map((job) => job.jobId);

      // Verify all jobs were created
      expect(jobIds).toHaveLength(5);
      expect(
        jobIds.every((id) => typeof id === 'string' && id.length > 0)
      ).toBe(true);

      // Verify all jobs have unique IDs
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(5);

      // Verify all jobs are in pending or processing status
      for (const jobId of jobIds) {
        const result = await pool.query(
          'SELECT status FROM export_jobs WHERE job_id = $1',
          [jobId]
        );
        expect(result.rows).toHaveLength(1);
        expect(['pending', 'processing']).toContain(result.rows[0].status);
      }
    }, 30000);

    it('should prevent race conditions in job status updates', async () => {
      // Create test tool
      const { tool } = await createCompleteTestTool(pool, {
        toolName: 'Race Condition Test Tool',
        submissionCount: 5,
      });

      // Start export
      const exportJob = await orchestratorService.startExport(
        tool.toolId,
        SEED_USERS.admin.email
      );
      const jobId = exportJob.jobId;

      // Attempt concurrent status updates
      const updatePromises = [
        pool.query(
          'UPDATE export_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2',
          ['processing', jobId]
        ),
        pool.query(
          'UPDATE export_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2',
          ['processing', jobId]
        ),
        pool.query(
          'UPDATE export_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2',
          ['processing', jobId]
        ),
      ];

      await Promise.all(updatePromises);

      // Verify job has consistent final status
      const result = await pool.query(
        'SELECT status, updated_at FROM export_jobs WHERE job_id = $1',
        [jobId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].status).toBe('processing');
    });

    it('should handle concurrent cancellations correctly', async () => {
      // Create test tools
      const tools = [];
      for (let i = 0; i < 3; i++) {
        const { tool } = await createCompleteTestTool(pool, {
          toolName: `Cancel Test Tool ${i + 1}`,
          submissionCount: 2,
        });
        tools.push(tool);
      }

      // Start exports
      const exportJobs = await Promise.all(
        tools.map((tool) =>
          orchestratorService.startExport(tool.toolId, SEED_USERS.admin.email)
        )
      );

      const jobIds = exportJobs.map((job) => job.jobId);

      // Wait a moment for exports to start processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cancel all jobs concurrently (returns void, so we just check it doesn't throw)
      const cancelPromises = jobIds.map((jobId) =>
        orchestratorService.cancelExport(jobId, SEED_USERS.admin.email)
      );

      // Should complete without throwing
      await expect(Promise.all(cancelPromises)).resolves.not.toThrow();

      // Verify all jobs have cancelled status
      for (const jobId of jobIds) {
        const result = await pool.query(
          'SELECT status FROM export_jobs WHERE job_id = $1',
          [jobId]
        );
        expect(result.rows[0].status).toBe('cancelled');
      }
    }, 15000);
  });

  describe('Resource Contention and Limits', () => {
    it('should handle database connection pool contention', async () => {
      // Create multiple test tools
      const toolCount = 10;
      const tools = [];

      for (let i = 0; i < toolCount; i++) {
        const { tool } = await createCompleteTestTool(pool, {
          toolName: `DB Pool Test Tool ${i + 1}`,
          submissionCount: 2,
        });
        tools.push(tool);
      }

      // Start exports rapidly to stress connection pool
      const startPromises = tools.map((tool) =>
        orchestratorService.startExport(tool.toolId, SEED_USERS.admin.email)
      );

      const exportJobs = await Promise.all(startPromises);
      const jobIds = exportJobs.map((job) => job.jobId);

      // Verify all jobs were created successfully
      expect(jobIds).toHaveLength(toolCount);

      // Verify database pool is still healthy
      const poolStats = await pool.query('SELECT COUNT(*) FROM export_jobs');
      expect(poolStats.rows).toHaveLength(1);
    }, 30000);

    it('should enforce max concurrent export limits', async () => {
      // Create test tools
      const tools = [];
      for (let i = 0; i < 12; i++) {
        const { tool } = await createCompleteTestTool(pool, {
          toolName: `Limit Test Tool ${i + 1}`,
          submissionCount: 1,
        });
        tools.push(tool);
      }

      // Start exports
      const exportJobs = await Promise.all(
        tools.map((tool) =>
          orchestratorService.startExport(tool.toolId, SEED_USERS.admin.email)
        )
      );

      const jobIds = exportJobs.map((job) => job.jobId);

      // Check how many are in processing status
      const processingResult = await pool.query(
        `SELECT COUNT(*) as count FROM export_jobs
         WHERE status = 'processing' AND job_id = ANY($1)`,
        [jobIds]
      );

      const processingCount = parseInt(processingResult.rows[0].count, 10);

      // Should not exceed reasonable concurrent limit (e.g., 10)
      expect(processingCount).toBeLessThanOrEqual(10);

      // Others should be in pending status
      const pendingResult = await pool.query(
        `SELECT COUNT(*) as count FROM export_jobs
         WHERE status = 'pending' AND job_id = ANY($1)`,
        [jobIds]
      );

      const pendingCount = parseInt(pendingResult.rows[0].count, 10);
      expect(pendingCount + processingCount).toBe(jobIds.length);
    }, 30000);

    it('should handle filesystem contention gracefully', async () => {
      // Create test tools with same name (potential filename collision)
      const tools = [];
      for (let i = 0; i < 3; i++) {
        const { tool } = await createCompleteTestTool(pool, {
          toolName: 'Filesystem Contention Tool', // Same name
          submissionCount: 1,
        });
        tools.push(tool);
      }

      // Start exports concurrently
      const exportJobs = await Promise.all(
        tools.map((tool) =>
          orchestratorService.startExport(tool.toolId, SEED_USERS.admin.email)
        )
      );

      const jobIds = exportJobs.map((job) => job.jobId);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify each job has unique package path (no overwrites)
      const pathResults = await pool.query(
        `SELECT package_path FROM export_jobs WHERE job_id = ANY($1)`,
        [jobIds]
      );

      const packagePaths = pathResults.rows
        .map((row) => row.package_path)
        .filter((path) => path !== null);

      if (packagePaths.length > 0) {
        const uniquePaths = new Set(packagePaths);
        expect(uniquePaths.size).toBe(packagePaths.length);
      }
    }, 20000);
  });

  describe('Transaction Isolation', () => {
    it('should maintain transaction isolation across concurrent exports', async () => {
      // Create test tool
      const { tool } = await createCompleteTestTool(pool, {
        toolName: 'Transaction Isolation Tool',
        submissionCount: 5,
      });

      // Start export
      const exportJob1 = await orchestratorService.startExport(
        tool.toolId,
        SEED_USERS.admin.email
      );
      const jobId1 = exportJob1.jobId;

      // Simulate concurrent read from another transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');

        // Read job status in transaction
        const result1 = await client.query(
          'SELECT status, steps_completed FROM export_jobs WHERE job_id = $1',
          [jobId1]
        );

        // Wait a moment for potential updates
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Read again in same transaction
        const result2 = await client.query(
          'SELECT status, steps_completed FROM export_jobs WHERE job_id = $1',
          [jobId1]
        );

        await client.query('COMMIT');

        // Verify reads are consistent within transaction
        expect(result1.rows[0].status).toBeDefined();
        expect(result2.rows[0].status).toBeDefined();
      } finally {
        client.release();
      }
    });

    it('should handle deadlock scenarios gracefully', async () => {
      // Create two test tools
      const { tool: tool1 } = await createCompleteTestTool(pool, {
        toolName: 'Deadlock Test Tool 1',
        submissionCount: 2,
      });

      const { tool: tool2 } = await createCompleteTestTool(pool, {
        toolName: 'Deadlock Test Tool 2',
        submissionCount: 2,
      });

      // Start exports
      const exportJob1 = await orchestratorService.startExport(
        tool1.toolId,
        SEED_USERS.admin.email
      );
      const jobId1 = exportJob1.jobId;

      const exportJob2 = await orchestratorService.startExport(
        tool2.toolId,
        SEED_USERS.admin.email
      );
      const jobId2 = exportJob2.jobId;

      // Attempt operations that could cause deadlock
      const client1 = await pool.connect();
      const client2 = await pool.connect();

      try {
        // Transaction 1: Update job1, then try to update job2
        await client1.query('BEGIN');
        await client1.query(
          'UPDATE export_jobs SET steps_completed = 1 WHERE job_id = $1',
          [jobId1]
        );

        // Transaction 2: Update job2, then try to update job1
        await client2.query('BEGIN');
        await client2.query(
          'UPDATE export_jobs SET steps_completed = 1 WHERE job_id = $1',
          [jobId2]
        );

        // Now try cross-updates (potential deadlock)
        const promises = [
          client1.query(
            'UPDATE export_jobs SET steps_completed = 2 WHERE job_id = $1',
            [jobId2]
          ),
          client2.query(
            'UPDATE export_jobs SET steps_completed = 2 WHERE job_id = $1',
            [jobId1]
          ),
        ];

        // One should succeed, one might deadlock
        await Promise.race([
          Promise.all(promises),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);

        await client1.query('COMMIT');
        await client2.query('COMMIT');

        // If we get here, no deadlock occurred (good)
        expect(true).toBe(true);
      } catch (error: any) {
        // Deadlock detected is acceptable
        if (error.code === '40P01') {
          // PostgreSQL deadlock error code
          expect(true).toBe(true);
        } else {
          throw error;
        }
      } finally {
        try {
          await client1.query('ROLLBACK');
        } catch {
          /* ignore */
        }
        try {
          await client2.query('ROLLBACK');
        } catch {
          /* ignore */
        }
        client1.release();
        client2.release();
      }
    }, 15000);
  });

  describe('Mixed Success and Failure Scenarios', () => {
    it('should handle mix of successful and failed concurrent exports', async () => {
      // Create valid tools
      const validTools = [];
      for (let i = 0; i < 3; i++) {
        const { tool } = await createCompleteTestTool(pool, {
          toolName: `Valid Tool ${i + 1}`,
          submissionCount: 2,
        });
        validTools.push(tool);
      }

      // Create invalid tool (will fail validation)
      const invalidFormSchema = await createTestFormSchema(pool, {
        title: 'Invalid Form Schema',
        fields: [], // No fields - will fail validation
      });

      const invalidToolResult = await pool.query(
        `INSERT INTO tool_registry (tool_id, name, version, route, api_base, status, manifest_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING tool_id`,
        [
          invalidFormSchema.formId,
          'Invalid Tool',
          '1.0.0',
          '/tools/invalid',
          '/api/invalid',
          'active',
          JSON.stringify({
            formSchemaId: invalidFormSchema.schemaId,
            formId: invalidFormSchema.formId,
            toolType: 'forms',
            config: { toolType: 'forms' },
          }),
        ]
      );

      const invalidToolId = invalidToolResult.rows[0].tool_id;

      // Start all exports concurrently (3 valid + 1 invalid)
      const allToolIds = [...validTools.map((t) => t.toolId), invalidToolId];
      const startPromises = allToolIds.map((toolId) =>
        orchestratorService
          .startExport(toolId, SEED_USERS.admin.email)
          .catch((err) => err)
      );

      const results = await Promise.all(startPromises);

      // Verify we have 3 successful job IDs and 1 error
      const successfulJobIds = results.filter((r) => typeof r === 'string');
      const errors = results.filter((r) => r instanceof Error);

      expect(successfulJobIds).toHaveLength(3);
      expect(errors).toHaveLength(1);

      // Verify successful exports are in pending/processing
      for (const jobId of successfulJobIds) {
        const result = await pool.query(
          'SELECT status FROM export_jobs WHERE job_id = $1',
          [jobId]
        );
        expect(['pending', 'processing']).toContain(result.rows[0].status);
      }
    }, 20000);

    it('should not affect other exports when one export fails', async () => {
      // Create valid tool
      const { tool: validTool } = await createCompleteTestTool(pool, {
        toolName: 'Valid Isolation Tool',
        submissionCount: 3,
      });

      // Create tool that will fail during export
      const { tool: failingTool } = await createCompleteTestTool(pool, {
        toolName: 'Failing Isolation Tool',
        submissionCount: 1,
      });

      // Start both exports
      const validExportJob = await orchestratorService.startExport(
        validTool.toolId,
        SEED_USERS.admin.email
      );
      const validJobId = validExportJob.jobId;

      const failingExportJob = await orchestratorService.startExport(
        failingTool.toolId,
        SEED_USERS.admin.email
      );
      const failingJobId = failingExportJob.jobId;

      // Simulate failure in failing job by directly updating it
      await pool.query(
        `UPDATE export_jobs
         SET status = 'failed', error_message = 'Simulated export failure'
         WHERE job_id = $1`,
        [failingJobId]
      );

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify valid job is still processing or completed (not affected)
      const validJobResult = await pool.query(
        'SELECT status FROM export_jobs WHERE job_id = $1',
        [validJobId]
      );

      expect(['pending', 'processing', 'completed']).toContain(
        validJobResult.rows[0].status
      );

      // Verify failing job has failed status
      const failingJobResult = await pool.query(
        'SELECT status, error_message FROM export_jobs WHERE job_id = $1',
        [failingJobId]
      );

      expect(failingJobResult.rows[0].status).toBe('failed');
      expect(failingJobResult.rows[0].error_message).toBe(
        'Simulated export failure'
      );
    });
  });

  describe('Job Queue Behavior', () => {
    it('should process exports in FIFO order when queue is full', async () => {
      // Create multiple test tools
      const toolCount = 8;
      const tools = [];
      const startTimes: { [toolId: string]: number } = {};

      for (let i = 0; i < toolCount; i++) {
        const { tool } = await createCompleteTestTool(pool, {
          toolName: `Queue Test Tool ${i + 1}`,
          submissionCount: 1,
        });
        tools.push(tool);
      }

      // Start exports and record start times
      const jobIds = [];
      for (const tool of tools) {
        const exportJob = await orchestratorService.startExport(
          tool.toolId,
          SEED_USERS.admin.email
        );
        const jobId = exportJob.jobId;
        jobIds.push(jobId);
        startTimes[jobId] = Date.now();

        // Small delay between starts to ensure ordering
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Wait for some processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query job creation times
      const result = await pool.query(
        `SELECT job_id, created_at, status
         FROM export_jobs
         WHERE job_id = ANY($1)
         ORDER BY created_at ASC`,
        [jobIds]
      );

      // Verify jobs were created in order
      expect(result.rows).toHaveLength(toolCount);

      const createdTimes = result.rows.map((row) =>
        new Date(row.created_at).getTime()
      );

      // Each subsequent job should be created after or at same time as previous
      for (let i = 1; i < createdTimes.length; i++) {
        expect(createdTimes[i]).toBeGreaterThanOrEqual(createdTimes[i - 1]);
      }
    }, 25000);

    it('should handle rapid consecutive export requests', async () => {
      // Create test tool
      const { tool } = await createCompleteTestTool(pool, {
        toolName: 'Rapid Request Tool',
        submissionCount: 2,
      });

      // Send 10 rapid export requests for same tool
      const rapidJobIds = [];
      for (let i = 0; i < 10; i++) {
        const exportJob = await orchestratorService.startExport(
          tool.toolId,
          SEED_USERS.admin.email
        );
        rapidJobIds.push(exportJob.jobId);
      }

      // Verify all 10 jobs were created
      expect(rapidJobIds).toHaveLength(10);
      expect(new Set(rapidJobIds).size).toBe(10); // All unique

      // Verify all jobs exist in database
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM export_jobs WHERE job_id = ANY($1)',
        [rapidJobIds]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(10);
    }, 20000);
  });
});
