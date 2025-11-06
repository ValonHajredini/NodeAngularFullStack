/**
 * Package Verification & Security Integration Tests
 * Tests checksum generation, integrity verification, and tamper detection
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.2 Package Verification & Security
 *
 * Test Coverage:
 * - Checksum generation during export
 * - Pre-download integrity verification
 * - Tamper detection (checksum mismatch)
 * - Checksum verification endpoint (GET /api/tool-registry/export-jobs/:jobId/checksum)
 * - Security event logging
 * - Legacy package handling (packages without checksums)
 */

import request from 'supertest';
import { app } from '../../src/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ExportJobRepository } from '../../src/repositories/export-job.repository';
import { ExportJobStatus } from '@nodeangularfullstack/shared';
import { databaseService } from '../../src/services/database.service';
import { generateFileChecksum } from '../../src/utils/checksum.utils';
import { logger } from '../../src/utils/logger.utils';

describe('Package Verification & Security', () => {
  let userToken: string;
  let userUserId: string;
  let testToolId: string;
  const exportJobRepo = new ExportJobRepository();
  const testPackagesDir = '/tmp/test-verification';

  beforeAll(async () => {
    // Get authentication tokens
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'User123!@#' });
    userToken = userLogin.body.data.accessToken;
    userUserId = userLogin.body.data.user.id;

    // Create test tool
    const pool = databaseService.getPool();
    const toolResult = await pool.query(
      `INSERT INTO tool_registry
       (tool_id, name, description, version, icon, route, api_base, permissions, status, manifest_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        'test-tool-verification',
        'Test Tool for Verification',
        'Test tool for verification testing',
        '1.0.0',
        null,
        '/tools/test-tool-verification',
        '/api/tools/test-tool-verification',
        null,
        'active',
        JSON.stringify({ description: 'Test tool' }),
        userUserId,
      ]
    );
    testToolId = toolResult.rows[0].id;

    // Create test packages directory
    await fs.mkdir(testPackagesDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test packages
    try {
      await fs.rm(testPackagesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up test tool
    const pool = databaseService.getPool();
    await pool.query('DELETE FROM tool_registry WHERE tool_id = $1', [
      'test-tool-verification',
    ]);
  });

  describe('Checksum Generation During Export', () => {
    let jobId: string;
    let packagePath: string;
    let packageChecksum: string;

    beforeEach(async () => {
      jobId = crypto.randomUUID();
      packagePath = path.join(testPackagesDir, `${jobId}.tar.gz`);

      // Create test package file (1KB of data)
      const testContent = Buffer.from('X'.repeat(1024));
      await fs.writeFile(packagePath, testContent);

      // Compute checksum
      packageChecksum = await generateFileChecksum(packagePath);

      // Create completed export job with checksum
      await exportJobRepo.create({
        jobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Export completed successfully',
      });

      await exportJobRepo.update(jobId, {
        packagePath,
        packageSizeBytes: testContent.length,
        packageChecksum,
        packageAlgorithm: 'sha256',
        completedAt: new Date(),
      });
    });

    afterEach(async () => {
      // Clean up test job and package
      try {
        await fs.unlink(packagePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }

      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
    });

    test('should store checksum in database after export', async () => {
      const job = await exportJobRepo.findById(jobId);
      expect(job).not.toBeNull();
      if (!job) return;

      expect(job.packageChecksum).toBe(packageChecksum);
      expect(job.packageAlgorithm).toBe('sha256');
      expect(job.packageChecksum).toHaveLength(64); // SHA-256 is 64 hex characters
      expect(job.packageChecksum).toMatch(/^[0-9a-f]{64}$/); // Lowercase hex
    });

    test('should verify package integrity before download', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/gzip');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should update checksum_verified_at after successful verification', async () => {
      await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const job = await exportJobRepo.findById(jobId);
      expect(job).not.toBeNull();
      if (!job) return;

      expect(job.checksumVerifiedAt).not.toBeNull();
      expect(job.checksumVerifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('Checksum Verification Endpoint', () => {
    let jobId: string;
    let packagePath: string;
    let packageChecksum: string;

    beforeEach(async () => {
      jobId = crypto.randomUUID();
      packagePath = path.join(testPackagesDir, `${jobId}.tar.gz`);

      // Create test package
      const testContent = Buffer.from('Y'.repeat(2048));
      await fs.writeFile(packagePath, testContent);
      packageChecksum = await generateFileChecksum(packagePath);

      // Create completed job with checksum
      await exportJobRepo.create({
        jobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(jobId, {
        packagePath,
        packageSizeBytes: testContent.length,
        packageChecksum,
        packageAlgorithm: 'sha256',
        completedAt: new Date(),
      });
    });

    afterEach(async () => {
      try {
        await fs.unlink(packagePath);
      } catch (error) {
        // Ignore
      }
      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
    });

    test('should return checksum metadata for completed job', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/checksum`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.jobId).toBe(jobId);
      expect(response.body.packageChecksum).toBe(packageChecksum);
      expect(response.body.algorithm).toBe('sha256');
      expect(response.body.packageSizeBytes).toBe(2048);
      expect(response.body.packageSizeMB).toMatch(/^\d+\.\d+ MB$/);
    });

    test('should reject checksum request for non-completed job', async () => {
      const pendingJobId = crypto.randomUUID();
      await exportJobRepo.create({
        jobId: pendingJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.IN_PROGRESS,
        stepsTotal: 8,
        stepsCompleted: 3,
        currentStep: 'Processing...',
      });

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${pendingJobId}/checksum`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('JOB_NOT_COMPLETED');
      expect(response.body.message).toContain('in_progress');

      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [pendingJobId]);
    });

    test('should reject checksum request for job without checksum', async () => {
      const legacyJobId = crypto.randomUUID();
      const legacyPackagePath = path.join(
        testPackagesDir,
        `${legacyJobId}.tar.gz`
      );
      await fs.writeFile(legacyPackagePath, Buffer.from('Z'.repeat(512)));

      await exportJobRepo.create({
        jobId: legacyJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(legacyJobId, {
        packagePath: legacyPackagePath,
        packageSizeBytes: 512,
        // No checksum for legacy package
        completedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${legacyJobId}/checksum`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('CHECKSUM_NOT_AVAILABLE');
      expect(response.body.message).toContain('not available');

      await fs.unlink(legacyPackagePath);
      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [legacyJobId]);
    });

    test('should set immutable cache headers for checksum endpoint', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/checksum`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers['cache-control']).toContain('immutable');
      expect(response.headers['cache-control']).toContain('max-age=31536000');
    });

    test('should require authentication for checksum endpoint', async () => {
      await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/checksum`)
        .expect(401);
    });
  });

  describe('Tamper Detection', () => {
    let jobId: string;
    let packagePath: string;
    let originalChecksum: string;

    beforeEach(async () => {
      jobId = crypto.randomUUID();
      packagePath = path.join(testPackagesDir, `${jobId}.tar.gz`);

      // Create original package
      const originalContent = Buffer.from('ORIGINAL_CONTENT_123');
      await fs.writeFile(packagePath, originalContent);
      originalChecksum = await generateFileChecksum(packagePath);

      // Create completed job with original checksum
      await exportJobRepo.create({
        jobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(jobId, {
        packagePath,
        packageSizeBytes: originalContent.length,
        packageChecksum: originalChecksum,
        packageAlgorithm: 'sha256',
        completedAt: new Date(),
      });
    });

    afterEach(async () => {
      try {
        await fs.unlink(packagePath);
      } catch (error) {
        // Ignore
      }
      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
    });

    test('should detect tampering when file is modified', async () => {
      // Simulate tampering by modifying the file
      await fs.writeFile(packagePath, Buffer.from('TAMPERED_CONTENT_456'));

      // Attempt to download
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('PACKAGE_TAMPERED');
      expect(response.body.message).toContain('integrity check failed');
      expect(response.body.message).toContain('tampered');
    });

    test('should not update checksumVerifiedAt on tamper detection', async () => {
      // Tamper with file
      await fs.writeFile(packagePath, Buffer.from('MODIFIED'));

      // Attempt download (should fail)
      await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Verify checksumVerifiedAt is still null
      const job = await exportJobRepo.findById(jobId);
      expect(job).not.toBeNull();
      if (!job) return;

      expect(job.checksumVerifiedAt).toBeNull();
    });

    test('should block download and log security alert on tampering', async () => {
      // Spy on logger to verify security alert
      const errorSpy = jest.spyOn(logger, 'error');

      // Tamper with file
      await fs.writeFile(packagePath, Buffer.from('MALICIOUS_CONTENT'));

      // Attempt download
      await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Verify security alert was logged
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ADMIN ALERT'),
        expect.objectContaining({
          alertType: 'PACKAGE_TAMPERED',
          jobId,
          userId: userUserId,
        })
      );

      errorSpy.mockRestore();
    });
  });

  describe('Legacy Package Handling', () => {
    let legacyJobId: string;
    let legacyPackagePath: string;

    beforeEach(async () => {
      legacyJobId = crypto.randomUUID();
      legacyPackagePath = path.join(testPackagesDir, `${legacyJobId}.tar.gz`);

      // Create legacy package (no checksum)
      await fs.writeFile(legacyPackagePath, Buffer.from('LEGACY_PACKAGE_DATA'));

      await exportJobRepo.create({
        jobId: legacyJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(legacyJobId, {
        packagePath: legacyPackagePath,
        packageSizeBytes: 18,
        // No checksum or algorithm for legacy package
        completedAt: new Date(),
      });
    });

    afterEach(async () => {
      try {
        await fs.unlink(legacyPackagePath);
      } catch (error) {
        // Ignore
      }
      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [legacyJobId]);
    });

    test('should allow download of legacy packages without checksum', async () => {
      const warnSpy = jest.spyOn(logger, 'warn');

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${legacyJobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/gzip');

      // Verify warning was logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY EVENT - WARNING'),
        expect.objectContaining({
          securityEvent: 'LEGACY_DOWNLOAD',
        })
      );

      warnSpy.mockRestore();
    });

    test('should log legacy download security event', async () => {
      const infoSpy = jest.spyOn(logger, 'warn');

      await request(app)
        .get(`/api/tool-registry/export-jobs/${legacyJobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify security event was logged with appropriate metadata
      expect(infoSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          jobId: legacyJobId,
          userId: userUserId,
          packagePath: legacyPackagePath,
          recommendation: expect.stringContaining('re-export'),
        })
      );

      infoSpy.mockRestore();
    });
  });

  describe('Security Headers', () => {
    let jobId: string;
    let packagePath: string;

    beforeEach(async () => {
      jobId = crypto.randomUUID();
      packagePath = path.join(testPackagesDir, `${jobId}.tar.gz`);

      await fs.writeFile(packagePath, Buffer.from('TEST_CONTENT'));
      const checksum = await generateFileChecksum(packagePath);

      await exportJobRepo.create({
        jobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(jobId, {
        packagePath,
        packageSizeBytes: 12,
        packageChecksum: checksum,
        packageAlgorithm: 'sha256',
        completedAt: new Date(),
      });
    });

    afterEach(async () => {
      try {
        await fs.unlink(packagePath);
      } catch (error) {
        // Ignore
      }
      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [jobId]);
    });

    test('should include all security headers in download response', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify all security headers are present
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-download-options']).toBe('noopen');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['content-security-policy']).toBe(
        "default-src 'none'"
      );
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    test('should include security headers in range request responses', async () => {
      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${jobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Range', 'bytes=0-5')
        .expect(206);

      // Verify security headers are present in partial content response
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-download-options']).toBe('noopen');
      expect(response.headers['content-security-policy']).toBe(
        "default-src 'none'"
      );
    });
  });

  describe('Error Scenarios', () => {
    test('should handle missing package file gracefully', async () => {
      const missingJobId = crypto.randomUUID();
      const missingPath = path.join(testPackagesDir, 'non-existent.tar.gz');
      const fakeChecksum =
        'a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2';

      await exportJobRepo.create({
        jobId: missingJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(missingJobId, {
        packagePath: missingPath,
        packageSizeBytes: 1000,
        packageChecksum: fakeChecksum,
        packageAlgorithm: 'sha256',
        completedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${missingJobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('FILE_NOT_FOUND');

      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [missingJobId]);
    });

    test('should handle checksum verification failure gracefully', async () => {
      const errorJobId = crypto.randomUUID();
      const errorPath = '/invalid/path/package.tar.gz';

      await exportJobRepo.create({
        jobId: errorJobId,
        toolId: testToolId,
        userId: userUserId,
        status: ExportJobStatus.COMPLETED,
        stepsTotal: 8,
        stepsCompleted: 8,
        currentStep: 'Completed',
      });

      await exportJobRepo.update(errorJobId, {
        packagePath: errorPath,
        packageSizeBytes: 1000,
        packageChecksum: 'a'.repeat(64), // Valid SHA-256 format (64 hex chars)
        packageAlgorithm: 'sha256',
        completedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/tool-registry/export-jobs/${errorJobId}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');

      await databaseService
        .getPool()
        .query('DELETE FROM export_jobs WHERE job_id = $1', [errorJobId]);
    });
  });
});
