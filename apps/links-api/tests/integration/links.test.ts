import request from 'supertest';
import express, { Express } from 'express';
import { Pool } from 'pg';
import { LinksRepository } from '../../src/repositories/links.repository';
import { AnalyticsRepository } from '../../src/repositories/analytics.repository';
import { LinksService } from '../../src/services/links.service';
import { LinksController } from '../../src/controllers/links.controller';
import { createLinksRoutes } from '../../src/routes/links.routes';
import { errorHandler } from '../../src/middleware/error.middleware';

// Mock auth middleware for testing
jest.mock('../../src/middleware/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: '8941f3c2-a64d-4eb0-b22b-58caedcc4697',
      email: 'test@example.com',
      role: 'admin',
    };
    next();
  },
}));

describe('Links API Integration Tests', () => {
  let app: Express;
  let pool: Pool;

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://dbuser:dbpassword@localhost:5435/links_db',
    });

    // Create Express app with all layers
    app = express();
    app.use(express.json());

    const linksRepo = new LinksRepository(pool);
    const analyticsRepo = new AnalyticsRepository(pool);
    const linksService = new LinksService(linksRepo, analyticsRepo, 'http://localhost:3003');
    const linksController = new LinksController(linksService);

    app.use(createLinksRoutes(linksController));
    app.use(errorHandler);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('TRUNCATE TABLE click_analytics CASCADE');
    await pool.query('TRUNCATE TABLE short_links CASCADE');
  });

  describe('POST /api/links/generate', () => {
    it('should generate a new short link', async () => {
      const response = await request(app)
        .post('/api/links/generate')
        .send({
          originalUrl: 'https://example.com/test-form',
          resourceType: 'form',
          resourceId: '123e4567-e89b-12d3-a456-426614174001',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Short link created successfully');
      expect(response.body.data).toHaveProperty('shortCode');
      expect(response.body.data).toHaveProperty('qrCode');
      expect(response.body.data).toHaveProperty('shortUrl');
      expect(response.body.data.shortCode).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it('should return existing link if already created', async () => {
      const requestBody = {
        originalUrl: 'https://example.com/duplicate',
        resourceType: 'form',
        resourceId: '123e4567-e89b-12d3-a456-426614174002',
      };

      const first = await request(app).post('/api/links/generate').send(requestBody);

      const second = await request(app).post('/api/links/generate').send(requestBody);

      expect(first.body.data.shortCode).toBe(second.body.data.shortCode);
      expect(first.body.data.id).toBe(second.body.data.id);
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/api/links/generate').send({
        // Missing originalUrl
        resourceType: 'form',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate URL format', async () => {
      const response = await request(app).post('/api/links/generate').send({
        originalUrl: 'not-a-valid-url',
        resourceType: 'form',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should support expiration date', async () => {
      const expiresAt = new Date('2025-12-31T23:59:59Z').toISOString();

      const response = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/expire-test',
        expiresAt,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.expiresAt).toBeTruthy();
    });
  });

  describe('GET /api/links/me', () => {
    it('should return user short links', async () => {
      // Create test links
      await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/link1',
        resourceType: 'form',
      });

      await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/link2',
        resourceType: 'svg',
      });

      const response = await request(app).get('/api/links/me');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('shortCode');
      expect(response.body.data[0]).toHaveProperty('originalUrl');
    });

    it('should return empty array for user with no links', async () => {
      const response = await request(app).get('/api/links/me');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /:shortCode (public redirect)', () => {
    it('should redirect to original URL', async () => {
      // Create short link
      const createResponse = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/redirect-test',
      });

      const shortCode = createResponse.body.data.shortCode;

      // Test redirect
      const response = await request(app).get(`/${shortCode}`).redirects(0); // Don't follow redirects

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/redirect-test');
    });

    it('should track analytics on redirect', async () => {
      // Create short link
      const createResponse = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/analytics-test',
      });

      const shortCode = createResponse.body.data.shortCode;
      const linkId = createResponse.body.data.id;

      // Perform redirect
      await request(app).get(`/${shortCode}`).redirects(0);

      // Verify analytics tracked
      const analyticsResponse = await request(app).get(`/api/links/${linkId}/analytics`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.data.totalClicks).toBe(1);
    });

    it('should return 404 for non-existent short code', async () => {
      const response = await request(app).get('/NOTEXIST').redirects(0);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 410 for expired link', async () => {
      // Create expired link
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const createResponse = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/expired',
        expiresAt: pastDate.toISOString(),
      });

      const shortCode = createResponse.body.data.shortCode;

      const response = await request(app).get(`/${shortCode}`).redirects(0);

      expect(response.status).toBe(410);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('PATCH /api/links/:id', () => {
    it('should update link expiration', async () => {
      // Create link
      const createResponse = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/update-test',
      });

      const linkId = createResponse.body.data.id;
      const newExpiry = new Date('2025-06-30T23:59:59Z').toISOString();

      // Update link
      const response = await request(app).patch(`/api/links/${linkId}`).send({
        expiresAt: newExpiry,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.expiresAt).toBeTruthy();
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .patch('/api/links/123e4567-e89b-12d3-a456-999999999999')
        .send({
          expiresAt: new Date().toISOString(),
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/links/:id', () => {
    it('should delete short link', async () => {
      // Create link
      const createResponse = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/delete-test',
      });

      const linkId = createResponse.body.data.id;

      // Delete link
      const deleteResponse = await request(app).delete(`/api/links/${linkId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toContain('deleted');

      // Verify deleted
      const links = await request(app).get('/api/links/me');
      expect(links.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app).delete('/api/links/123e4567-e89b-12d3-a456-999999999999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/links/:id/analytics', () => {
    it('should return analytics summary', async () => {
      // Create link
      const createResponse = await request(app).post('/api/links/generate').send({
        originalUrl: 'https://example.com/analytics-summary',
      });

      const linkId = createResponse.body.data.id;
      const shortCode = createResponse.body.data.shortCode;

      // Generate some clicks
      await request(app).get(`/${shortCode}`).redirects(0);
      await request(app).get(`/${shortCode}`).redirects(0);

      // Get analytics
      const response = await request(app).get(`/api/links/${linkId}/analytics`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalClicks');
      expect(response.body.data).toHaveProperty('uniqueVisitors');
      expect(response.body.data).toHaveProperty('clicksByDevice');
      expect(response.body.data).toHaveProperty('recentClicks');
      expect(response.body.data.totalClicks).toBe(2);
    });
  });
});
