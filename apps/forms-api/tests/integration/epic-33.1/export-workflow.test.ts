/**
 * Integration Test: Complete Export Workflow
 *
 * Tests the full export flow from API call to package generation:
 * 1. Start export job via API
 * 2. Poll job status until completion
 * 3. Verify status transitions (pending → in_progress → completed)
 * 4. Verify package file exists and is valid
 *
 * Story 33.1.5 Task 2
 */

import request from 'supertest';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import {
  setupEpic33_1Tests,
  teardownEpic33_1Tests,
  getTestPool,
} from './setup';
import { cleanupAfterTest } from './teardown';
import {
  pollExportJobStatus,
  verifyExportPackage,
  extractExportPackage,
  cleanupExtractedPackage,
} from './helpers';
import {
  createCompleteTestTool,
  SEED_USERS,
} from '../../fixtures/epic-33.1/test-fixtures';
import app from '../../../src/server';
import * as path from 'path';

describe('Export Workflow Integration Test', () => {
  let pool: Pool;
  let adminToken: string;
  let testToolId: string;

  // Set longer timeout for export operations (2 minutes)
  jest.setTimeout(120000);

  beforeAll(async () => {
    // Setup Epic 33.1 test environment
    await setupEpic33_1Tests();
    pool = getTestPool();

    // Get admin authentication token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: SEED_USERS.admin.email,
        password: SEED_USERS.admin.password,
      })
      .expect(200);

    adminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await teardownEpic33_1Tests();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Complete Export Flow', () => {
    it('should complete full export workflow: start → in_progress → completed', async () => {
      // Step 1: Create test tool with form schema and submissions
      const { tool, formSchema } = await createCompleteTestTool(pool, {
        toolName: 'Customer Feedback Form',
        submissionCount: 10,
      });

      testToolId = tool.toolId;

      // Step 2: Start export via API
      const startResponse = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const { jobId } = startResponse.body;
      expect(jobId).toBeDefined();
      expect(startResponse.body.status).toBe('pending');
      expect(startResponse.body.toolId).toBe(testToolId);
      expect(startResponse.body.stepsCompleted).toBe(0);

      // Step 3: Poll job status until completed or failed
      const result = await pollExportJobStatus(pool, jobId, {
        maxAttempts: 120, // 2 minutes max (1 second intervals)
        intervalMs: 1000,
        expectedStatus: ['completed', 'failed', 'cancelled'],
      });

      // Step 4: Verify job completed successfully
      expect(result.status).toBe('completed');
      expect(result.stepsCompleted).toBeGreaterThan(0);
      expect(result.stepsTotal).toBeGreaterThan(0);
      expect(result.stepsCompleted).toBe(result.stepsTotal);
      expect(result.packagePath).toBeTruthy();
      expect(result.errorMessage).toBeNull();

      // Step 5: Verify job record in database
      const jobResult = await pool.query(
        'SELECT * FROM export_jobs WHERE job_id = $1',
        [jobId]
      );
      const job = jobResult.rows[0];

      expect(job.status).toBe('completed');
      expect(job.steps_completed).toBe(job.steps_total);
      expect(job.package_path).toBeTruthy();
      expect(job.completed_at).toBeTruthy();
      expect(job.started_at).toBeTruthy();
      expect(new Date(job.completed_at).getTime()).toBeGreaterThan(
        new Date(job.started_at).getTime()
      );

      // Step 6: Verify package file exists and is valid
      const packagePath = job.package_path;
      const packageInfo = await verifyExportPackage(packagePath);

      expect(packageInfo.exists).toBe(true);
      expect(packageInfo.isValidTarGz).toBe(true);
      expect(packageInfo.sizeBytes).toBeGreaterThan(0);

      // Step 7: Extract and verify package contents
      const extractDir = path.join('/tmp/test-extracts', `extract-${jobId}`);
      await fs.mkdir(extractDir, { recursive: true });

      const files = await extractExportPackage(packagePath, extractDir);

      // Verify essential boilerplate files exist
      expect(files).toContain('package.json');
      expect(files).toContain('Dockerfile');
      expect(files).toContain('docker-compose.yml');
      expect(files).toContain('README.md');

      // Cleanup extracted files
      await cleanupExtractedPackage(extractDir);
    });

    it('should fail export if validation has errors', async () => {
      // Create tool with missing form schema (invalid)
      const invalidToolResult = await pool.query(
        `
        INSERT INTO tool_registry (tool_id, tool_name, tool_type, status, tool_metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING tool_id
      `,
        [
          'test-invalid-tool-789',
          'Invalid Form',
          'forms',
          'active',
          { formSchemaId: 'non-existent-form-schema' },
        ]
      );

      const invalidToolId = invalidToolResult.rows[0].tool_id;

      // Attempt to start export (should fail validation)
      const response = await request(app)
        .post(`/api/tool-registry/tools/${invalidToolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422); // Unprocessable Entity

      expect(response.body.message).toMatch(/validation|not found/i);

      // Cleanup
      await pool.query('DELETE FROM tool_registry WHERE tool_id = $1', [
        invalidToolId,
      ]);
    });

    it('should track job progress during export', async () => {
      // Create test tool
      const { tool } = await createCompleteTestTool(pool, {
        toolName: 'Contact Form',
        submissionCount: 5,
      });

      // Start export
      const startResponse = await request(app)
        .post(`/api/tool-registry/tools/${tool.toolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const { jobId } = startResponse.body;

      // Track progress over multiple polls
      const progressSnapshots: number[] = [];
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        const statusResponse = await request(app)
          .get(`/api/tool-registry/export-jobs/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const { status, stepsCompleted, stepsTotal } = statusResponse.body;
        progressSnapshots.push(stepsCompleted);

        if (status === 'completed' || status === 'failed') {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      // Verify progress increased over time
      expect(progressSnapshots.length).toBeGreaterThan(1);

      // Check that stepsCompleted increased (not necessarily monotonically, but final should be higher)
      const firstProgress = progressSnapshots[0];
      const lastProgress = progressSnapshots[progressSnapshots.length - 1];
      expect(lastProgress).toBeGreaterThanOrEqual(firstProgress);
    });

    it('should return 404 for non-existent tool', async () => {
      const nonExistentToolId = 'non-existent-tool-id';

      const response = await request(app)
        .post(`/api/tool-registry/tools/${nonExistentToolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toMatch(/not found|does not exist/i);
    });

    it('should return 404 for non-existent job status', async () => {
      const nonExistentJobId = 'non-existent-job-id';

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${nonExistentJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toMatch(/not found|does not exist/i);
    });

    it('should require authentication for all endpoints', async () => {
      // Create test tool
      const { tool } = await createCompleteTestTool(pool, {
        toolName: 'Test Form Auth',
      });

      // Test start export without auth
      await request(app)
        .post(`/api/tool-registry/tools/${tool.toolId}/export`)
        .expect(401);

      // Test get status without auth
      await request(app)
        .get(`/api/tool-registry/export-jobs/some-job-id`)
        .expect(401);

      // Test cancel without auth
      await request(app)
        .post(`/api/tool-registry/export-jobs/some-job-id/cancel`)
        .expect(401);
    });

    it('should create job with correct initial values', async () => {
      // Create test tool
      const { tool } = await createCompleteTestTool(pool, {
        toolName: 'Initial Values Test',
      });

      // Start export
      const response = await request(app)
        .post(`/api/tool-registry/tools/${tool.toolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const job = response.body;

      // Verify initial job values
      expect(job.jobId).toBeDefined();
      expect(job.toolId).toBe(tool.toolId);
      expect(job.status).toBe('pending');
      expect(job.stepsCompleted).toBe(0);
      expect(job.stepsTotal).toBeGreaterThanOrEqual(0);
      expect(job.currentStep).toBeDefined();
      expect(job.createdAt).toBeDefined();
      expect(job.updatedAt).toBeDefined();
      expect(job.packagePath).toBeUndefined(); // Not yet generated
      expect(job.errorMessage).toBeUndefined();
    });
  });

  describe('Status Polling', () => {
    it('should return consistent status on repeated polls', async () => {
      // Create and start export
      const { tool } = await createCompleteTestTool(pool);

      const startResponse = await request(app)
        .post(`/api/tool-registry/tools/${tool.toolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const { jobId } = startResponse.body;

      // Poll multiple times rapidly
      const results = await Promise.all([
        request(app)
          .get(`/api/tool-registry/export-jobs/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get(`/api/tool-registry/export-jobs/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get(`/api/tool-registry/export-jobs/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

      // All should return 200 OK
      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.body.jobId).toBe(jobId);
      });
    });

    it('should include progressPercentage in status response', async () => {
      // Create and start export
      const { tool } = await createCompleteTestTool(pool);

      const startResponse = await request(app)
        .post(`/api/tool-registry/tools/${tool.toolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const { jobId } = startResponse.body;

      // Get status
      const statusResponse = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify progressPercentage is calculated
      expect(statusResponse.body.progressPercentage).toBeDefined();
      expect(typeof statusResponse.body.progressPercentage).toBe('number');
      expect(statusResponse.body.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(statusResponse.body.progressPercentage).toBeLessThanOrEqual(100);
    });

    it('should set no-cache headers on status endpoint', async () => {
      // Create and start export
      const { tool } = await createCompleteTestTool(pool);

      const startResponse = await request(app)
        .post(`/api/tool-registry/tools/${tool.toolId}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const { jobId } = startResponse.body;

      // Get status
      const statusResponse = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify no-cache headers
      expect(statusResponse.headers['cache-control']).toMatch(
        /no-cache|no-store/i
      );
    });
  });
});
