/**
 * Export Package Download Integration Tests
 * Tests the complete download flow including authentication, permissions, streaming, and range requests
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.1 Export Package Download (Task 11)
 */

import request from 'supertest';
import { app } from '../../src/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ExportJobRepository } from '../../src/repositories/export-job.repository';
import { ExportJobStatus } from '@nodeangularfullstack/shared';
import { databaseService } from '../../src/services/database.service';

describe('Export Package Download (GET /api/tool-registry/export-jobs/:jobId/download)', () => {
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let adminUserId: string;
  let userUserId: string;
  let jobId: string;
  let testToolId: string;
  let packagePath: string;
  const exportJobRepo = new ExportJobRepository();

  beforeAll(async () => {
    // Get authentication tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin123!@#' });
    adminToken = adminLogin.body.data.accessToken;
    adminUserId = adminLogin.body.data.user.id;

    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'User123!@#' });
    userToken = userLogin.body.data.accessToken;
    userUserId = userLogin.body.data.user.id;

    const otherLogin = await request(app).post('/api/v1/auth/register').send({
      email: 'other@example.com',
      password: 'Other123!@#',
      firstName: 'Other',
      lastName: 'User',
    });
    otherUserToken = otherLogin.body.data.accessToken;

    // Create a test tool in the registry for export testing
    const pool = databaseService.getPool();
    const toolResult = await pool.query(
      `INSERT INTO tool_registry
       (tool_id, name, description, version, icon, route, api_base, permissions, status, manifest_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        'test-tool-download',
        'Test Tool for Download',
        'Test tool for download testing',
        '1.0.0',
        null,
        '/tools/test-tool-download',
        '/api/tools/test-tool-download',
        null,
        'active',
        JSON.stringify({ description: 'Test tool for download' }),
        adminUserId,
      ]
    );
    testToolId = toolResult.rows[0].id;

    // Create test package file
    const testPackagesDir = '/tmp/test-packages';
    await fs.mkdir(testPackagesDir, { recursive: true });

    packagePath = path.join(testPackagesDir, 'test-export.tar.gz');
    // Create a file large enough for range request tests (at least 150 bytes)
    const testContent = Buffer.from('A'.repeat(200));
    await fs.writeFile(packagePath, testContent);

    // Create test export job
    jobId = crypto.randomUUID();

    await exportJobRepo.create({
      jobId,
      toolId: testToolId,
      userId: userUserId,
      status: ExportJobStatus.COMPLETED,
      stepsTotal: 8,
      stepsCompleted: 8,
      currentStep: 'Export completed successfully',
    });

    // Update job with package info
    await exportJobRepo.update(jobId, {
      packagePath,
      packageSizeBytes: testContent.length,
      completedAt: new Date(),
      packageExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  });

  afterAll(async () => {
    // Cleanup: delete test job and package
    const pool = databaseService.getPool();
    await pool.query('DELETE FROM export_jobs WHERE tool_id = $1', [
      testToolId,
    ]);
    await pool.query('DELETE FROM tool_registry WHERE id = $1', [testToolId]);
    await fs.unlink(packagePath).catch(() => {});
    await fs.rmdir('/tmp/test-packages').catch(() => {});
  });

  describe('Successful Downloads', () => {
    it('should download package by job creator (200 OK)', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify headers
      expect(response.headers['content-type']).toBe('application/gzip');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.tar.gz');
      expect(response.headers['content-length']).toBeTruthy();
      expect(response.headers['cache-control']).toContain('private');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['x-package-size']).toBeTruthy();

      // Verify body is binary content
      expect(
        Buffer.isBuffer(response.body) || response.body instanceof Buffer
      ).toBe(true);
    });

    it('should download package by admin user (200 OK)', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/gzip');
    });

    it('should increment download count after successful download', async () => {
      // Get initial download count
      const jobBefore = await exportJobRepo.findById(jobId);
      const initialCount = jobBefore!.downloadCount;

      // Download package
      await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify download count incremented
      const jobAfter = await exportJobRepo.findById(jobId);
      expect(jobAfter!.downloadCount).toBe(initialCount + 1);
      expect(jobAfter!.lastDownloadedAt).toBeTruthy();
    });
  });

  describe('Permission Checks', () => {
    it('should return 403 for unauthorized user (not job creator or admin)', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.code).toBe('DOWNLOAD_UNAUTHORIZED');
      expect(response.body.message).toContain('Only job creator or admin');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent job', async () => {
      const nonExistentJobId = crypto.randomUUID();
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${nonExistentJobId}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.code).toBe('JOB_NOT_FOUND');
    });

    it('should return 404 for job not yet completed', async () => {
      // Create pending job
      const pendingJobId = crypto.randomUUID();
      await exportJobRepo.create({
        jobId: pendingJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.IN_PROGRESS,
        stepsTotal: 8,
        stepsCompleted: 3,
      });

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${pendingJobId}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.code).toBe('PACKAGE_NOT_READY');
      expect(response.body.message).toContain('not ready');

      // Cleanup
      await exportJobRepo.delete(pendingJobId);
    });

    it('should return 410 for expired package (packagePath is null)', async () => {
      // Create expired job
      const expiredJobId = crypto.randomUUID();
      await exportJobRepo.create({
        jobId: expiredJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
      });

      // Mark as expired (null packagePath)
      await exportJobRepo.update(expiredJobId, {
        packagePath: null,
        completedAt: new Date(),
        packageExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${expiredJobId}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(410);

      expect(response.body.code).toBe('PACKAGE_EXPIRED');
      expect(response.body.message).toContain('expired');

      // Cleanup
      await exportJobRepo.delete(expiredJobId);
    });
  });

  describe('Range Requests (Resume Support)', () => {
    it('should support partial content request (206)', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Range', 'bytes=0-99')
        .expect(206);

      expect(response.headers['content-range']).toMatch(/bytes 0-99\/\d+/);
      expect(response.headers['content-length']).toBe('100');
      expect(response.headers['accept-ranges']).toBe('bytes');
    });

    it('should support range request with only start byte', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Range', 'bytes=10-')
        .expect(206);

      expect(response.headers['content-range']).toMatch(/bytes 10-\d+\/\d+/);
    });

    it('should return 400 for invalid range request', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Range', 'bytes=9999999-10000000') // Beyond file size
        .expect(400);

      expect(response.body.code).toBe('INVALID_RANGE');
    });
  });

  describe('HTTP Headers', () => {
    it('should set all required headers for browser download', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify all required headers
      expect(response.headers['content-type']).toBe('application/gzip');
      expect(response.headers['content-disposition']).toMatch(
        /attachment; filename="export-.+\.tar\.gz"/
      );
      expect(response.headers['content-length']).toBeTruthy();
      expect(response.headers['cache-control']).toBe('private, max-age=3600');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['x-package-size']).toMatch(
        /\d+(\.\d+)? (B|KB|MB|GB)/
      );
    });

    it('should generate filename with tool name and date', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(
        /filename="export-.+-\d{4}-\d{2}-\d{2}\.tar\.gz"/
      );
    });
  });
});
