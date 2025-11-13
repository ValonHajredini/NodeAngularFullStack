/**
 * Category Analytics API Integration Tests
 *
 * Tests the REST API endpoint for category-specific analytics.
 * Validates authentication, authorization, and analytics data retrieval for all categories.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import request from 'supertest';
import express, { Application } from 'express';
import { formsPool, authPool } from '../../src/config/multi-database.config';
import { PoolClient } from 'pg';
import analyticsRoutes from '../../src/routes/analytics.routes';
import { JwtUtils } from '../../src/utils/jwt.utils';

// Test app setup (mimics main server)
let app: Application;
let formsClient: PoolClient;
let authClient: PoolClient;
let testUserId: string;
let otherUserId: string;
let accessToken: string;
let otherUserToken: string;
let pollFormId: string;
let quizFormId: string;
let productFormId: string;

beforeAll(async () => {
  // Setup test Express app
  app = express();
  app.use(express.json());
  app.use('/api/v1/analytics', analyticsRoutes);

  // Add error handling middleware (mimics production server)
  app.use((err: any, _req: any, res: any, _next: any) => {
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_ERROR';
    res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: err.message || 'An error occurred',
      timestamp: new Date().toISOString(),
    });
  });

  // Get database clients (separate for auth and forms)
  formsClient = await formsPool.connect();
  authClient = await authPool.connect();

  // Create test users (in auth database)
  const userResult = await authClient.query(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'analytics-test@example.com',
      '$2b$10$dummy.hash.for.testing',
      'Analytics',
      'Tester',
      'user',
      NOW(),
      NOW()
    )
    RETURNING id
  `);
  testUserId = userResult.rows[0].id;

  const otherResult = await authClient.query(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'other-user@example.com',
      '$2b$10$dummy.hash.for.testing',
      'Other',
      'User',
      'user',
      NOW(),
      NOW()
    )
    RETURNING id
  `);
  otherUserId = otherResult.rows[0].id;

  // Generate JWT tokens for auth
  accessToken = JwtUtils.generateAccessToken({
    userId: testUserId,
    email: 'analytics-test@example.com',
    role: 'user'
  });

  otherUserToken = JwtUtils.generateAccessToken({
    userId: otherUserId,
    email: 'other-user@example.com',
    role: 'user'
  });

  // Create test forms (in forms database)
  const pollForm = await formsClient.query(`
    INSERT INTO forms (id, title, description, status, user_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Test Poll',
      'Poll for analytics testing',
      'published',
      $1,
      NOW(),
      NOW()
    )
    RETURNING id
  `, [testUserId]);
  pollFormId = pollForm.rows[0].id;

  const quizForm = await formsClient.query(`
    INSERT INTO forms (id, title, description, status, user_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Test Quiz',
      'Quiz for analytics testing',
      'published',
      $1,
      NOW(),
      NOW()
    )
    RETURNING id
  `, [testUserId]);
  quizFormId = quizForm.rows[0].id;

  const productForm = await formsClient.query(`
    INSERT INTO forms (id, title, description, status, user_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Test Product',
      'Product form for analytics testing',
      'published',
      $1,
      NOW(),
      NOW()
    )
    RETURNING id
  `, [testUserId]);
  productFormId = productForm.rows[0].id;

  // Create form schemas with category metadata (in forms database)
  await Promise.all([
    formsClient.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Poll", "category": "polls", "fields": [{"type": "radio", "label": "Poll Question"}]}'::jsonb,
        1,
        true
      )
    `, [pollFormId]),

    formsClient.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Quiz", "category": "quiz", "fields": [{"type": "number", "label": "Quiz Score"}]}'::jsonb,
        1,
        true
      )
    `, [quizFormId]),

    formsClient.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Product", "category": "ecommerce", "fields": [{"type": "text", "label": "Product Name"}]}'::jsonb,
        1,
        true
      )
    `, [productFormId]),
  ]);

  // Seed some submissions for testing (in forms database)
  const pollSchemaResult = await formsClient.query(
    'SELECT id FROM form_schemas WHERE form_id = $1',
    [pollFormId]
  );
  const pollSchemaId = pollSchemaResult.rows[0].id;

  for (let i = 0; i < 50; i++) {
    const option = i < 25 ? 'Option A' : i < 40 ? 'Option B' : 'Option C';
    await formsClient.query(`
      INSERT INTO form_submissions (form_schema_id, values_json, submitter_ip, submitted_at)
      VALUES ($1, $2, '127.0.0.1', NOW() - INTERVAL '${i} hours')
    `, [pollSchemaId, JSON.stringify({ poll_option: option })]);
  }
});

afterAll(async () => {
  // Cleanup test data (forms data in forms database, users in auth database)
  await formsClient.query('DELETE FROM form_submissions WHERE form_schema_id IN (SELECT id FROM form_schemas WHERE form_id IN ($1, $2, $3))', [pollFormId, quizFormId, productFormId]);
  await formsClient.query('DELETE FROM form_schemas WHERE form_id IN ($1, $2, $3)', [pollFormId, quizFormId, productFormId]);
  await formsClient.query('DELETE FROM forms WHERE id IN ($1, $2, $3)', [pollFormId, quizFormId, productFormId]);
  await authClient.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, otherUserId]);

  formsClient.release();
  authClient.release();
  await formsPool.end();
  await authPool.end();
});

describe('GET /api/v1/analytics/:formId/category-metrics', () => {
  describe('Authentication', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'Authorization header is required');
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'Authorization header must use Bearer scheme');
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid formId (not UUID)', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/invalid-uuid/category-metrics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('message', 'Invalid input data');
    });
  });

  describe('Authorization', () => {
    it('should return 403 when user does not own the form', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'FORBIDDEN');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('permission');
    });

    it('should return 404 for non-existent form', async () => {
      const nonExistentFormId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/analytics/${nonExistentFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'FORM_NOT_FOUND');
      expect(response.body).toHaveProperty('message', 'Form not found');
    });
  });

  describe('Category-Specific Analytics', () => {
    it('should return poll metrics for poll form', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Analytics retrieved successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');

      const { data } = response.body;
      expect(data).toHaveProperty('category', 'polls');
      expect(data).toHaveProperty('totalSubmissions');
      expect(data).toHaveProperty('voteCounts');
      expect(data).toHaveProperty('votePercentages');
      expect(data).toHaveProperty('uniqueVoters');
      expect(data).toHaveProperty('mostPopularOption');

      // Verify data types
      expect(typeof data.totalSubmissions).toBe('number');
      expect(typeof data.voteCounts).toBe('object');
      expect(typeof data.votePercentages).toBe('object');
      expect(typeof data.uniqueVoters).toBe('number');
      expect(typeof data.mostPopularOption).toBe('string');

      // Verify we have submission data
      expect(data.totalSubmissions).toBeGreaterThan(0);
    });

    it('should return quiz metrics for quiz form', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${quizFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const { data } = response.body;
      expect(data).toHaveProperty('category', 'quiz');
      expect(data).toHaveProperty('totalSubmissions');
      expect(data).toHaveProperty('averageScore');
      expect(data).toHaveProperty('medianScore');
      expect(data).toHaveProperty('passRate');
      expect(data).toHaveProperty('scoreDistribution');
      expect(data).toHaveProperty('questionAccuracy');

      // Verify data types
      expect(typeof data.averageScore).toBe('number');
      expect(typeof data.medianScore).toBe('number');
      expect(typeof data.passRate).toBe('number');
      expect(typeof data.scoreDistribution).toBe('object');
      expect(typeof data.questionAccuracy).toBe('object');
    });

    it('should return product metrics for ecommerce form', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${productFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const { data } = response.body;
      expect(data).toHaveProperty('category', 'ecommerce');
      expect(data).toHaveProperty('totalSubmissions');
      expect(data).toHaveProperty('totalRevenue');
      expect(data).toHaveProperty('averageOrderValue');
      expect(data).toHaveProperty('totalItemsSold');
      expect(data).toHaveProperty('topProducts');
      expect(data).toHaveProperty('lowStockAlerts');
      expect(data).toHaveProperty('outOfStockCount');

      // Verify data types
      expect(typeof data.totalRevenue).toBe('number');
      expect(typeof data.averageOrderValue).toBe('number');
      expect(typeof data.totalItemsSold).toBe('number');
      expect(Array.isArray(data.topProducts)).toBe(true);
      expect(typeof data.lowStockAlerts).toBe('number');
      expect(typeof data.outOfStockCount).toBe('number');
    });
  });

  describe('Response Format', () => {
    it('should return standardized response structure', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toMatchObject({
        success: expect.any(Boolean),
        message: expect.any(String),
        data: expect.any(Object),
        timestamp: expect.any(String),
      });

      // Verify ISO timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp
      );
    });

    it('should include common analytics fields in all responses', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const { data } = response.body;

      // Common CategoryMetricsBase fields
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('totalSubmissions');
      expect(typeof data.category).toBe('string');
      expect(typeof data.totalSubmissions).toBe('number');
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time (< 1000ms)', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`/api/v1/analytics/${pollFormId}/category-metrics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
