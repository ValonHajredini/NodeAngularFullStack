/**
 * Integration Tests: Get Export Status Endpoint
 * Story 33.1.3: Export Job Status Tracking (Task 12)
 *
 * Tests GET /api/tool-registry/export-jobs/:jobId endpoint
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, authenticatedRequest } from '../helpers/auth-helper';
import { databaseService } from '../../src/services/database.service';

describe('GET /api/tool-registry/export-jobs/:jobId', () => {
  let adminAuth: any;
  let testJobId: string;
  let testToolId: string;

  beforeAll(async () => {
    adminAuth = await createTestUser({ role: 'admin' });

    const pool = databaseService.getPool();

    // Create test tool
    const toolResult = await pool.query(
      `INSERT INTO tool_registry (tool_id, name, version, route, api_base, manifest_json, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        'test-tool-status',
        'Test Tool',
        '1.0.0',
        '/test',
        '/api/test',
        '{}',
        true,
        adminAuth.user.id,
      ]
    );
    testToolId = toolResult.rows[0].id;

    // Create test job
    const jobResult = await pool.query(
      `INSERT INTO export_jobs (tool_id, user_id, status, steps_completed, steps_total, current_step)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING job_id`,
      [
        testToolId,
        adminAuth.user.id,
        'in_progress',
        5,
        8,
        'Generating Docker config',
      ]
    );
    testJobId = jobResult.rows[0].job_id;
  });

  afterAll(async () => {
    const pool = databaseService.getPool();
    await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [testJobId]);
    await pool.query('DELETE FROM tool_registry WHERE id = $1', [testToolId]);
    await pool.query('DELETE FROM users WHERE id = $1', [adminAuth.user.id]);
  });

  it('should return job status (200 OK)', async () => {
    const response = await authenticatedRequest(adminAuth.token)
      .get(`/api/tool-registry/export-jobs/${testJobId}`)
      .expect(200);

    expect(response.body.jobId).toBe(testJobId);
    expect(response.body.status).toBe('in_progress');
    expect(response.body.stepsCompleted).toBe(5);
    expect(response.body.stepsTotal).toBe(8);
    expect(response.body.progressPercentage).toBe(62);
  });

  it('should include Cache-Control headers for no caching', async () => {
    const response = await authenticatedRequest(adminAuth.token)
      .get(`/api/tool-registry/export-jobs/${testJobId}`)
      .expect(200);

    expect(response.headers['cache-control']).toContain('no-cache');
    expect(response.headers['pragma']).toBe('no-cache');
  });

  it('should return 404 for non-existent job', async () => {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    const response = await authenticatedRequest(adminAuth.token)
      .get(`/api/tool-registry/export-jobs/${fakeJobId}`)
      .expect(404);

    expect(response.body.code).toBe('JOB_NOT_FOUND');
  });

  it('should return 401 without authentication', async () => {
    await request(app)
      .get(`/api/tool-registry/export-jobs/${testJobId}`)
      .expect(401);
  });

  it('should return 400 for invalid jobId format', async () => {
    await authenticatedRequest(adminAuth.token)
      .get('/api/tool-registry/export-jobs/invalid-id')
      .expect(400);
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit of 10 req/sec', async () => {
      const requests = [];
      for (let i = 0; i < 11; i++) {
        requests.push(
          authenticatedRequest(adminAuth.token).get(
            `/api/tool-registry/export-jobs/${testJobId}`
          )
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      // At least one request should be rate limited
      expect(tooManyRequests.length).toBeGreaterThan(0);
    }, 10000);
  });
});
