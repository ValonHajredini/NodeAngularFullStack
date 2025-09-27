import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import { createApp } from '../../src/server.js';
import { DatabaseUtils } from '../../src/utils/database.utils.js';

/**
 * Integration tests for Short Links API endpoints
 * Tests complete API functionality with database integration
 */
describe('Short Links API Integration', () => {
  let app: Express;
  let pool: Pool;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Initialize test database and app
    pool = DatabaseUtils.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME_TEST || 'nodeangularfullstack_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    app = createApp(pool);

    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
      });

    userId = registerResponse.body.user.id;

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'testuser@example.com',
      password: 'TestPass123!',
    });

    authToken = loginResponse.body.accessToken;

    // Enable short-link tool
    await pool.query(
      'INSERT INTO tools_registry (name, enabled, config) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET enabled = $2',
      ['short-link', true, '{}']
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM short_links WHERE created_by = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('DELETE FROM tools_registry WHERE name = $1', [
      'short-link',
    ]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up any existing short links for this user
    await pool.query('DELETE FROM short_links WHERE created_by = $1', [userId]);
  });

  afterEach(async () => {
    // Clean up short links after each test
    await pool.query('DELETE FROM short_links WHERE created_by = $1', [userId]);
  });

  describe('POST /api/tools/short-links', () => {
    it('should create a short link successfully', async () => {
      const response = await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        code: expect.stringMatching(/^[A-Za-z0-9]{6,8}$/),
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: userId,
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify in database
      const dbResult = await pool.query(
        'SELECT * FROM short_links WHERE code = $1',
        [response.body.code]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].original_url).toBe('https://example.com');
    });

    it('should create short link with expiration date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.org',
          expiresAt: futureDate.toISOString(),
        })
        .expect(201);

      expect(response.body.expiresAt).toBe(futureDate.toISOString());

      // Verify in database
      const dbResult = await pool.query(
        'SELECT * FROM short_links WHERE code = $1',
        [response.body.code]
      );
      expect(new Date(dbResult.rows[0].expires_at)).toEqual(futureDate);
    });

    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'data:text/html,<script>',
        'ftp://example.com',
        '',
      ];

      for (const url of invalidUrls) {
        await request(app)
          .post('/api/tools/short-links')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ originalUrl: url })
          .expect(400);
      }
    });

    it('should reject past expiration dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
          expiresAt: pastDate.toISOString(),
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/tools/short-links')
        .send({
          originalUrl: 'https://example.com',
        })
        .expect(401);
    });

    it('should respect rate limiting', async () => {
      // Create multiple requests quickly to test rate limiting
      const promises = Array.from({ length: 60 }, () =>
        request(app)
          .post('/api/tools/short-links')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ originalUrl: 'https://example.com' })
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should fail when tool is disabled', async () => {
      // Disable the tool
      await pool.query(
        'UPDATE tools_registry SET enabled = false WHERE name = $1',
        ['short-link']
      );

      await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
        })
        .expect(403);

      // Re-enable the tool
      await pool.query(
        'UPDATE tools_registry SET enabled = true WHERE name = $1',
        ['short-link']
      );
    });
  });

  describe('GET /api/tools/short-links/:code', () => {
    let testCode: string;

    beforeEach(async () => {
      // Create a test short link
      const response = await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
        });

      testCode = response.body.code;
    });

    it('should resolve short link successfully', async () => {
      const response = await request(app)
        .get(`/api/tools/short-links/${testCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        code: testCode,
        originalUrl: 'https://example.com',
        clickCount: expect.any(Number),
      });
    });

    it('should return 404 for non-existent code', async () => {
      await request(app)
        .get('/api/tools/short-links/notfound')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 410 for expired links', async () => {
      // Create expired link
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Manually insert expired link
      const result = await pool.query(
        `INSERT INTO short_links (code, original_url, expires_at, created_by)
         VALUES ($1, $2, $3, $4) RETURNING code`,
        ['expired', 'https://example.com', pastDate, userId]
      );

      await request(app)
        .get(`/api/tools/short-links/${result.rows[0].code}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(410);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/tools/short-links/${testCode}`).expect(401);
    });
  });

  describe('GET /s/:code (Public Redirect)', () => {
    let testCode: string;

    beforeEach(async () => {
      // Create a test short link
      const response = await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
        });

      testCode = response.body.code;
    });

    it('should redirect to original URL', async () => {
      const response = await request(app).get(`/s/${testCode}`).expect(302);

      expect(response.headers.location).toBe('https://example.com');

      // Verify click count was incremented
      const dbResult = await pool.query(
        'SELECT click_count FROM short_links WHERE code = $1',
        [testCode]
      );
      expect(dbResult.rows[0].click_count).toBe(1);
    });

    it('should return 404 for non-existent code', async () => {
      await request(app).get('/s/notfound').expect(404);
    });

    it('should return 410 for expired links', async () => {
      // Create expired link
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = await pool.query(
        `INSERT INTO short_links (code, original_url, expires_at, created_by)
         VALUES ($1, $2, $3, $4) RETURNING code`,
        ['expired', 'https://example.com', pastDate, userId]
      );

      await request(app).get(`/s/${result.rows[0].code}`).expect(410);
    });

    it('should work without authentication', async () => {
      // Public redirect should not require authentication
      await request(app).get(`/s/${testCode}`).expect(302);
    });

    it('should increment click count on each access', async () => {
      // Access the link multiple times
      await request(app).get(`/s/${testCode}`).expect(302);
      await request(app).get(`/s/${testCode}`).expect(302);
      await request(app).get(`/s/${testCode}`).expect(302);

      // Verify click count
      const dbResult = await pool.query(
        'SELECT click_count FROM short_links WHERE code = $1',
        [testCode]
      );
      expect(dbResult.rows[0].click_count).toBe(3);
    });

    it('should update last accessed timestamp', async () => {
      const beforeTime = new Date();

      await request(app).get(`/s/${testCode}`).expect(302);

      const dbResult = await pool.query(
        'SELECT last_accessed_at FROM short_links WHERE code = $1',
        [testCode]
      );

      const lastAccessed = new Date(dbResult.rows[0].last_accessed_at);
      expect(lastAccessed.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
    });
  });

  describe('GET /api/tools/short-links (List user links)', () => {
    beforeEach(async () => {
      // Create multiple test links
      const urls = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];

      for (const url of urls) {
        await request(app)
          .post('/api/tools/short-links')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ originalUrl: url });
      }
    });

    it('should list user links with pagination', async () => {
      const response = await request(app)
        .get('/api/tools/short-links?limit=2&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        code: expect.any(String),
        originalUrl: expect.stringMatching(/^https:\/\/example\d\.com$/),
        createdBy: userId,
      });
    });

    it('should handle empty results', async () => {
      // Clear all links
      await pool.query('DELETE FROM short_links WHERE created_by = $1', [
        userId,
      ]);

      const response = await request(app)
        .get('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/tools/short-links').expect(401);
    });
  });

  describe('GET /api/tools/short-links/stats (User statistics)', () => {
    beforeEach(async () => {
      // Create test links with some clicks
      const response1 = await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ originalUrl: 'https://example1.com' });

      const response2 = await request(app)
        .post('/api/tools/short-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ originalUrl: 'https://example2.com' });

      // Simulate clicks
      await request(app).get(`/s/${response1.body.code}`);
      await request(app).get(`/s/${response1.body.code}`);
      await request(app).get(`/s/${response2.body.code}`);
    });

    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/tools/short-links/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalLinks: 2,
        totalClicks: 3,
        recentLinks: expect.arrayContaining([
          expect.objectContaining({
            code: expect.any(String),
            originalUrl: expect.stringMatching(/^https:\/\/example\d\.com$/),
            clickCount: expect.any(Number),
          }),
        ]),
      });
    });

    it('should require authentication', async () => {
      await request(app).get('/api/tools/short-links/stats').expect(401);
    });
  });
});
