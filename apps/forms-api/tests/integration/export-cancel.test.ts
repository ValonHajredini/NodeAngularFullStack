/**
 * Integration Tests: Cancel Export Endpoint
 * Story 33.1.3: Export Job Status Tracking (Task 13)
 *
 * Tests POST /api/tool-registry/export-jobs/:jobId/cancel endpoint
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, authenticatedRequest } from '../helpers/auth-helper';
import { databaseService } from '../../src/services/database.service';

describe('POST /api/tool-registry/export-jobs/:jobId/cancel', () => {
  let adminAuth: any;
  let userAuth: any;
  let testToolId: string;

  beforeAll(async () => {
    adminAuth = await createTestUser({ role: 'admin' });
    userAuth = await createTestUser({ role: 'user' });

    const pool = databaseService.getPool();
    const toolResult = await pool.query(
      `INSERT INTO tool_registry (tool_id, name, version, route, api_base, manifest_json, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        'test-tool-cancel',
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
  });

  afterAll(async () => {
    const pool = databaseService.getPool();
    await pool.query('DELETE FROM tool_registry WHERE id = $1', [testToolId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [
      [adminAuth.user.id, userAuth.user.id],
    ]);
  });

  it('should cancel export by job creator (200 OK)', async () => {
    // Create in_progress job
    const pool = databaseService.getPool();
    const jobResult = await pool.query(
      `INSERT INTO export_jobs (tool_id, user_id, status)
       VALUES ($1, $2, $3) RETURNING job_id`,
      [testToolId, userAuth.user.id, 'in_progress']
    );
    const jobId = jobResult.rows[0].job_id;

    const response = await authenticatedRequest(userAuth.token)
      .post(`/api/tool-registry/export-jobs/${jobId}/cancel`)
      .expect(200);

    expect(response.body.message).toContain('cancelled successfully');
    expect(response.body.jobId).toBe(jobId);
    expect(response.body.status).toBe('cancelling');

    const pool = databaseService.getPool();
    await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
  });

  it('should cancel export by admin (200 OK)', async () => {
    // Create job owned by regular user
    const pool = databaseService.getPool();
    const jobResult = await pool.query(
      `INSERT INTO export_jobs (tool_id, user_id, status)
       VALUES ($1, $2, $3) RETURNING job_id`,
      [testToolId, userAuth.user.id, 'pending']
    );
    const jobId = jobResult.rows[0].job_id;

    // Admin can cancel any job
    const response = await authenticatedRequest(adminAuth.token)
      .post(`/api/tool-registry/export-jobs/${jobId}/cancel`)
      .expect(200);

    expect(response.body.message).toContain('cancelled successfully');

    await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
  });

  it('should return 403 when user tries to cancel another users job', async () => {
    // Create job owned by admin
    const pool = databaseService.getPool();
    const jobResult = await pool.query(
      `INSERT INTO export_jobs (tool_id, user_id, status)
       VALUES ($1, $2, $3) RETURNING job_id`,
      [testToolId, adminAuth.user.id, 'in_progress']
    );
    const jobId = jobResult.rows[0].job_id;

    // Regular user cannot cancel admin's job
    const response = await authenticatedRequest(userAuth.token)
      .post(`/api/tool-registry/export-jobs/${jobId}/cancel`)
      .expect(403);

    expect(response.body.code).toBe('UNAUTHORIZED_CANCELLATION');

    await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
  });

  it('should return 409 when trying to cancel completed job', async () => {
    // Create completed job
    const pool = databaseService.getPool();
    const jobResult = await pool.query(
      `INSERT INTO export_jobs (tool_id, user_id, status)
       VALUES ($1, $2, $3) RETURNING job_id`,
      [testToolId, adminAuth.user.id, 'completed']
    );
    const jobId = jobResult.rows[0].job_id;

    const response = await authenticatedRequest(adminAuth.token)
      .post(`/api/tool-registry/export-jobs/${jobId}/cancel`)
      .expect(409);

    expect(response.body.code).toBe('INVALID_JOB_STATUS');
    expect(response.body.message).toContain('completed');

    await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
  });

  it('should return 404 for non-existent job', async () => {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    const response = await authenticatedRequest(adminAuth.token)
      .post(`/api/tool-registry/export-jobs/${fakeJobId}/cancel`)
      .expect(404);

    expect(response.body.code).toBe('JOB_NOT_FOUND');
  });

  it('should return 401 without authentication', async () => {
    await request(app)
      .post('/api/tool-registry/export-jobs/some-job-id/cancel')
      .expect(401);
  });
});
