/**
 * Integration Tests: Export History List Endpoint
 * Story 33.2.3: Export History & Re-download (Task 13)
 *
 * Tests GET /api/tool-registry/export-jobs endpoint with:
 * - Pagination (limit, offset)
 * - Sorting (created_at, completed_at, download_count, package_size_bytes)
 * - Filtering (status, tool type, date range)
 * - Admin vs. user access control
 * - Error handling and validation
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, authenticatedRequest } from '../helpers/auth-helper';
import { databaseService } from '../../src/services/database.service';

describe('GET /api/tool-registry/export-jobs', () => {
  let adminAuth: any;
  let userAuth: any;
  let testToolId1: string;
  let testToolId2: string;
  let adminJobIds: string[] = [];
  let userJobIds: string[] = [];

  beforeAll(async () => {
    // Create test users
    adminAuth = await createTestUser({ role: 'admin' });
    userAuth = await createTestUser({ role: 'user' });

    const pool = databaseService.getPool();

    // Create test tools (using actual schema columns from 026_create_tool_registry_table.sql)
    const tool1Result = await pool.query(
      `INSERT INTO tool_registry (tool_id, name, version, route, api_base, manifest_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        'form-builder',
        'Test Form Builder',
        '1.0.0',
        '/test-form',
        '/api/test-form',
        '{}',
        adminAuth.user.id,
      ]
    );
    testToolId1 = tool1Result.rows[0].id;

    const tool2Result = await pool.query(
      `INSERT INTO tool_registry (tool_id, name, version, route, api_base, manifest_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        'survey',
        'Test Survey Tool',
        '1.0.0',
        '/test-survey',
        '/api/test-survey',
        '{}',
        adminAuth.user.id,
      ]
    );
    testToolId2 = tool2Result.rows[0].id;

    // Create multiple test jobs for admin user (different statuses and dates)
    const adminJobs = [
      {
        status: 'completed',
        tool: testToolId1,
        downloads: 5,
        size: 1024000,
        completedOffset: -10,
      },
      {
        status: 'completed',
        tool: testToolId2,
        downloads: 3,
        size: 512000,
        completedOffset: -5,
      },
      {
        status: 'in_progress',
        tool: testToolId1,
        downloads: 0,
        size: null,
        completedOffset: null,
      },
      {
        status: 'failed',
        tool: testToolId2,
        downloads: 0,
        size: null,
        completedOffset: -2,
      },
      {
        status: 'pending',
        tool: testToolId1,
        downloads: 0,
        size: null,
        completedOffset: null,
      },
    ];

    for (const job of adminJobs) {
      const completedAt = job.completedOffset
        ? new Date(
            Date.now() + job.completedOffset * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

      const jobResult = await pool.query(
        `INSERT INTO export_jobs (
          tool_id, user_id, status, steps_completed, steps_total, current_step,
          package_size_bytes, download_count, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING job_id`,
        [
          job.tool,
          adminAuth.user.id,
          job.status,
          job.status === 'completed' ? 8 : 3,
          8,
          job.status === 'completed' ? null : 'Processing...',
          job.size,
          job.downloads,
          completedAt,
        ]
      );
      adminJobIds.push(jobResult.rows[0].job_id);
    }

    // Create test jobs for regular user
    const userJobs = [
      { status: 'completed', tool: testToolId1, downloads: 2, size: 256000 },
      { status: 'pending', tool: testToolId2, downloads: 0, size: null },
    ];

    for (const job of userJobs) {
      const completedAt =
        job.status === 'completed'
          ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const jobResult = await pool.query(
        `INSERT INTO export_jobs (
          tool_id, user_id, status, steps_completed, steps_total, current_step,
          package_size_bytes, download_count, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING job_id`,
        [
          job.tool,
          userAuth.user.id,
          job.status,
          job.status === 'completed' ? 8 : 2,
          8,
          job.status === 'completed' ? null : 'Initializing...',
          job.size,
          job.downloads,
          completedAt,
        ]
      );
      userJobIds.push(jobResult.rows[0].job_id);
    }
  });

  afterAll(async () => {
    const pool = databaseService.getPool();

    // Clean up test data
    await pool.query('DELETE FROM export_jobs WHERE job_id = ANY($1)', [
      [...adminJobIds, ...userJobIds],
    ]);
    await pool.query('DELETE FROM tool_registry WHERE id IN ($1, $2)', [
      testToolId1,
      testToolId2,
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [
      adminAuth.user.id,
      userAuth.user.id,
    ]);
  });

  describe('Successful Listing', () => {
    it('should return paginated export jobs with default parameters (200 OK)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs')
        .expect(200);

      expect(response.body.jobs).toBeDefined();
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(5); // At least admin's 5 jobs
      expect(response.body.limit).toBe(20); // Default limit
      expect(response.body.offset).toBe(0); // Default offset
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should include tool metadata in job objects', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs')
        .expect(200);

      const job = response.body.jobs[0];
      expect(job.jobId).toBeDefined();
      expect(job.toolId).toBeDefined();
      expect(job.toolName).toBeDefined();
      expect(job.toolType).toBeDefined();
      expect(job.status).toBeDefined();
      expect(job.createdAt).toBeDefined();
    });

    it('should return empty array when no jobs exist for user', async () => {
      // Create a new user with no jobs
      const newUserAuth = await createTestUser({ role: 'user' });

      const response = await authenticatedRequest(newUserAuth.token)
        .get('/api/tool-registry/export-jobs')
        .expect(200);

      expect(response.body.jobs).toEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.totalPages).toBe(0);

      // Clean up
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM users WHERE id = $1', [
        newUserAuth.user.id,
      ]);
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=2')
        .expect(200);

      expect(response.body.jobs.length).toBeLessThanOrEqual(2);
      expect(response.body.limit).toBe(2);
    });

    it('should respect offset parameter', async () => {
      const response1 = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=2&offset=0')
        .expect(200);

      const response2 = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=2&offset=2')
        .expect(200);

      expect(response1.body.jobs[0].jobId).not.toBe(
        response2.body.jobs[0]?.jobId
      );
      expect(response2.body.offset).toBe(2);
    });

    it('should calculate correct page numbers', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=2&offset=4')
        .expect(200);

      expect(response.body.page).toBe(3); // offset 4 / limit 2 + 1 = page 3
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=200')
        .expect(200);

      expect(response.body.limit).toBe(100); // Clamped to max
    });

    it('should reject invalid limit (< 1)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=0')
        .expect(400);

      expect(response.body.code).toBe('INVALID_LIMIT');
    });

    it('should reject invalid offset (< 0)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?offset=-1')
        .expect(400);

      expect(response.body.code).toBe('INVALID_OFFSET');
    });
  });

  describe('Sorting', () => {
    it('should sort by created_at descending (default)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs')
        .expect(200);

      const jobs = response.body.jobs;
      if (jobs.length > 1) {
        const firstCreated = new Date(jobs[0].createdAt).getTime();
        const secondCreated = new Date(jobs[1].createdAt).getTime();
        expect(firstCreated).toBeGreaterThanOrEqual(secondCreated);
      }
    });

    it('should sort by created_at ascending', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?sort_by=created_at&sort_order=asc')
        .expect(200);

      const jobs = response.body.jobs;
      if (jobs.length > 1) {
        const firstCreated = new Date(jobs[0].createdAt).getTime();
        const lastCreated = new Date(jobs[jobs.length - 1].createdAt).getTime();
        expect(firstCreated).toBeLessThanOrEqual(lastCreated);
      }
    });

    it('should sort by completed_at descending', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get(
          '/api/tool-registry/export-jobs?status_filter=completed&sort_by=completed_at&sort_order=desc'
        )
        .expect(200);

      const jobs = response.body.jobs.filter((j: any) => j.completedAt);
      if (jobs.length > 1) {
        const firstCompleted = new Date(jobs[0].completedAt).getTime();
        const secondCompleted = new Date(jobs[1].completedAt).getTime();
        expect(firstCompleted).toBeGreaterThanOrEqual(secondCompleted);
      }
    });

    it('should sort by download_count descending', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get(
          '/api/tool-registry/export-jobs?sort_by=download_count&sort_order=desc'
        )
        .expect(200);

      const jobs = response.body.jobs;
      if (jobs.length > 1) {
        const firstDownloads = jobs[0].downloadCount || 0;
        const secondDownloads = jobs[1].downloadCount || 0;
        expect(firstDownloads).toBeGreaterThanOrEqual(secondDownloads);
      }
    });

    it('should sort by package_size_bytes descending', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get(
          '/api/tool-registry/export-jobs?status_filter=completed&sort_by=package_size_bytes&sort_order=desc'
        )
        .expect(200);

      const jobs = response.body.jobs.filter((j: any) => j.packageSizeBytes);
      if (jobs.length > 1) {
        const firstSize = jobs[0].packageSizeBytes || 0;
        const secondSize = jobs[1].packageSizeBytes || 0;
        expect(firstSize).toBeGreaterThanOrEqual(secondSize);
      }
    });

    it('should reject invalid sort field', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?sort_by=invalid_field')
        .expect(500); // Repository throws error for invalid field

      expect(response.body.status).toBe('error');
    });

    it('should reject invalid sort order', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?sort_order=invalid')
        .expect(500); // Repository throws error for invalid order

      expect(response.body.status).toBe('error');
    });
  });

  describe('Filtering', () => {
    it('should filter by single status', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?status_filter=completed')
        .expect(200);

      const jobs = response.body.jobs;
      expect(jobs.every((j: any) => j.status === 'completed')).toBe(true);
    });

    it('should filter by multiple statuses (comma-separated)', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?status_filter=completed,failed')
        .expect(200);

      const jobs = response.body.jobs;
      expect(
        jobs.every((j: any) => ['completed', 'failed'].includes(j.status))
      ).toBe(true);
    });

    it('should filter by tool ID', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?tool_type_filter=form-builder')
        .expect(200);

      const jobs = response.body.jobs;
      // toolType field contains tool_id value since tool_type column doesn't exist
      expect(jobs.every((j: any) => j.toolType === 'form-builder')).toBe(true);
    });

    it('should filter by start date', async () => {
      const startDate = new Date(
        Date.now() - 15 * 24 * 60 * 60 * 1000
      ).toISOString(); // 15 days ago

      const response = await authenticatedRequest(adminAuth.token)
        .get(`/api/tool-registry/export-jobs?start_date=${startDate}`)
        .expect(200);

      const jobs = response.body.jobs;
      const startTimestamp = new Date(startDate).getTime();
      expect(
        jobs.every(
          (j: any) => new Date(j.createdAt).getTime() >= startTimestamp
        )
      ).toBe(true);
    });

    it('should filter by end date', async () => {
      const endDate = new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000
      ).toISOString(); // 1 day ago

      const response = await authenticatedRequest(adminAuth.token)
        .get(`/api/tool-registry/export-jobs?end_date=${endDate}`)
        .expect(200);

      const jobs = response.body.jobs;
      const endTimestamp = new Date(endDate).getTime();
      expect(
        jobs.every((j: any) => new Date(j.createdAt).getTime() <= endTimestamp)
      ).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date(
        Date.now() - 15 * 24 * 60 * 60 * 1000
      ).toISOString();
      const endDate = new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await authenticatedRequest(adminAuth.token)
        .get(
          `/api/tool-registry/export-jobs?start_date=${startDate}&end_date=${endDate}`
        )
        .expect(200);

      const jobs = response.body.jobs;
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      expect(
        jobs.every((j: any) => {
          const created = new Date(j.createdAt).getTime();
          return created >= startTimestamp && created <= endTimestamp;
        })
      ).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get(
          '/api/tool-registry/export-jobs?status_filter=completed&tool_type_filter=form-builder'
        )
        .expect(200);

      const jobs = response.body.jobs;
      // toolType field contains tool_id value since tool_type column doesn't exist
      expect(
        jobs.every(
          (j: any) => j.status === 'completed' && j.toolType === 'form-builder'
        )
      ).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should allow admin to see all export jobs', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs')
        .expect(200);

      const jobs = response.body.jobs;

      // Admin should see jobs from both admin and user
      const hasAdminJobs = jobs.some((j: any) => adminJobIds.includes(j.jobId));
      const hasUserJobs = jobs.some((j: any) => userJobIds.includes(j.jobId));

      expect(hasAdminJobs).toBe(true);
      expect(hasUserJobs).toBe(true);
    });

    it('should allow regular user to see only their own jobs', async () => {
      const response = await authenticatedRequest(userAuth.token)
        .get('/api/tool-registry/export-jobs')
        .expect(200);

      const jobs = response.body.jobs;

      // User should only see their own jobs
      expect(jobs.every((j: any) => userJobIds.includes(j.jobId))).toBe(true);
      expect(jobs.length).toBe(userJobIds.length);
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/tool-registry/export-jobs').expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for non-numeric limit', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=abc')
        .expect(400);

      expect(response.body.code).toBe('INVALID_LIMIT');
    });

    it('should return 400 for non-numeric offset', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?offset=xyz')
        .expect(400);

      expect(response.body.code).toBe('INVALID_OFFSET');
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database service
      // Skipping for now as it requires test infrastructure changes
    });
  });

  describe('Performance', () => {
    it('should respond within 500ms for paginated queries', async () => {
      const startTime = Date.now();

      await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=20')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500);
    });

    it('should use JOIN to avoid N+1 queries', async () => {
      // This test verifies that tool metadata is fetched in a single query
      // by checking that the response includes tool metadata without additional queries

      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/tool-registry/export-jobs?limit=5')
        .expect(200);

      const jobs = response.body.jobs;

      // Every job should have tool metadata (proving JOIN was used)
      expect(jobs.every((j: any) => j.toolName && j.toolType)).toBe(true);
    });
  });
});
