/**
 * Integration Tests: Start Export Endpoint
 * Story 33.1.3: Export Job Status Tracking (Task 11)
 *
 * Tests POST /api/tool-registry/tools/:toolId/export endpoint
 */

import request from 'supertest';
import { app } from '../../src/server';
import {
  createTestUser,
  authenticatedRequest,
  createInvalidToken,
} from '../helpers/auth-helper';
import { databaseService } from '../../src/services/database.service';

describe('POST /api/tool-registry/tools/:toolId/export', () => {
  let adminAuth: any;
  let userAuth: any;
  let testToolId: string;

  beforeAll(async () => {
    // Create test users with different roles
    adminAuth = await createTestUser({ role: 'admin' });
    userAuth = await createTestUser({ role: 'user' });

    // Create a test tool in the registry for export testing
    const pool = databaseService.getPool();
    const toolResult = await pool.query(
      `INSERT INTO tool_registry
       (tool_id, name, version, route, api_base, manifest_json, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        'test-tool-export',
        'Test Tool for Export',
        '1.0.0',
        '/tools/test-tool-export',
        '/api/tools/test-tool-export',
        JSON.stringify({ description: 'Test tool for export' }),
        true,
        adminAuth.user.id,
      ]
    );

    testToolId = toolResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    const pool = databaseService.getPool();
    await pool.query('DELETE FROM export_jobs WHERE tool_id = $1', [
      testToolId,
    ]);
    await pool.query('DELETE FROM tool_registry WHERE id = $1', [testToolId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [
      [adminAuth.user.id, userAuth.user.id],
    ]);
  });

  describe('Success Cases', () => {
    it('should start export job with admin user (201 Created)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.toolId).toBe(testToolId);
      expect(response.body.userId).toBe(adminAuth.user.id);
      expect(response.body.status).toBe('pending');
      expect(response.body.stepsCompleted).toBe(0);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Clean up
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [
        response.body.jobId,
      ]);
    });

    it('should return jobId immediately (non-blocking)', async () => {
      const startTime = Date.now();

      const response = await authenticatedRequest(adminAuth.token)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .expect(201);

      const duration = Date.now() - startTime;

      // Response should be immediate (< 500ms)
      expect(duration).toBeLessThan(500);
      expect(response.body).toHaveProperty('jobId');

      // Clean up
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [
        response.body.jobId,
      ]);
    });

    it('should allow concurrent export requests for same tool', async () => {
      // Start two exports concurrently
      const [response1, response2] = await Promise.all([
        authenticatedRequest(adminAuth.token)
          .post(`/api/tool-registry/tools/${testToolId}/export`)
          .expect(201),
        authenticatedRequest(adminAuth.token)
          .post(`/api/tool-registry/tools/${testToolId}/export`)
          .expect(201),
      ]);

      // Both should succeed with different job IDs
      expect(response1.body.jobId).not.toBe(response2.body.jobId);
      expect(response1.body.status).toBe('pending');
      expect(response2.body.status).toBe('pending');

      // Clean up
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM export_jobs WHERE job_id = ANY($1)', [
        [response1.body.jobId, response2.body.jobId],
      ]);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid toolId format (not UUID)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .post('/api/tool-registry/tools/invalid-tool-id/export')
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('Authorization Errors', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .set('Authorization', `Bearer ${createInvalidToken()}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 403 for user without export permission', async () => {
      const response = await authenticatedRequest(userAuth.token)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('PERMISSION_DENIED');
      expect(response.body.message).toContain('export permission');
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for non-existent tool', async () => {
      const fakeToolId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(adminAuth.token)
        .post(`/api/tool-registry/tools/${fakeToolId}/export`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('TOOL_NOT_FOUND');
    });
  });

  describe('Response Format', () => {
    it('should include all required job fields in response', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .expect(201);

      // Verify all required fields are present
      const requiredFields = [
        'jobId',
        'toolId',
        'userId',
        'status',
        'stepsCompleted',
        'stepsTotal',
        'currentStep',
        'createdAt',
        'updatedAt',
      ];

      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });

      // Clean up
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [
        response.body.jobId,
      ]);
    });

    it('should have ISO 8601 timestamps', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .post(`/api/tool-registry/tools/${testToolId}/export`)
        .expect(201);

      // Verify timestamps are valid ISO 8601 strings
      expect(response.body.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(response.body.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );

      // Clean up
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM export_jobs WHERE job_id = $1', [
        response.body.jobId,
      ]);
    });
  });
});
