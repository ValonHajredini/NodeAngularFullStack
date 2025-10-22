import request from 'supertest';
import { createTestApp } from '../helpers/test-server';
import { Application } from 'express';
import { generateFormSchemaData } from '../helpers/data-factory';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';

describe('GET /api/forms/:id/tokens/status', () => {
  let app: Application;
  let userToken: string;
  let adminToken: string;
  let testFormId: string;

  beforeAll(async () => {
    app = createTestApp();

    // Register test users
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test-user@example.com',
        password: 'UserTest123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      })
      .expect(201);

    await request(app)
      .post('/auth/register')
      .send({
        email: 'test-admin@example.com',
        password: 'AdminTest123!@#',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
      })
      .expect(201);

    // Get authentication tokens
    const userLoginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'test-user@example.com',
        password: 'UserTest123!@#',
      })
      .expect(200);

    userToken = userLoginRes.body.data.accessToken;

    const adminLoginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'test-admin@example.com',
        password: 'AdminTest123!@#',
      })
      .expect(200);

    adminToken = adminLoginRes.body.data.accessToken;

    // Create a test form
    const createFormRes = await request(app)
      .post('/api/forms')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Token Status Test Form',
        description: 'Form for testing token status functionality',
        status: 'draft',
      })
      .expect(201);

    testFormId = createFormRes.body.data.id;
  });

  describe('Authentication', () => {
    it('should return 401 without authentication token', async () => {
      await request(app)
        .get(`/api/forms/${testFormId}/tokens/status`)
        .expect(401);
    });

    it("should return 403 for user trying to check another user's form tokens", async () => {
      // Create form with admin user
      const adminFormRes = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Form',
          description: 'Form owned by admin',
          status: 'draft',
        })
        .expect(201);

      const adminFormId = adminFormRes.body.data.id;

      // Try to check admin's form tokens with user token
      await request(app)
        .get(`/api/forms/${adminFormId}/tokens/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Form without published tokens', () => {
    it('should return hasValidToken: false for unpublished form', async () => {
      const response = await request(app)
        .get(`/api/forms/${testFormId}/tokens/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasValidToken).toBe(false);
      expect(response.body.data.tokenExpiration).toBeNull();
      expect(response.body.data.formUrl).toBe('');
    });
  });

  describe('Form with published tokens', () => {
    let publishedFormId: string;

    beforeEach(async () => {
      // Create and publish a form for each test
      const createFormRes = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Published Form',
          description: 'Form with published token',
          status: 'draft',
        })
        .expect(201);

      publishedFormId = createFormRes.body.data.id;

      // Create a form schema for the form
      const schemaData = generateFormSchemaData(publishedFormId);
      await formSchemasRepository.createSchema(publishedFormId, schemaData);

      // Publish the form with 30-day expiration
      await request(app)
        .post(`/api/forms/${publishedFormId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          expiresInDays: 30,
        })
        .expect(200);
    });

    it('should return hasValidToken: true for form with valid token', async () => {
      const response = await request(app)
        .get(`/api/forms/${publishedFormId}/tokens/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasValidToken).toBe(true);
      expect(response.body.data.tokenExpiration).toBeTruthy();
      expect(response.body.data.tokenCreatedAt).toBeTruthy();
      expect(response.body.data.formUrl).toContain('/public/form/');
    });

    it('should return proper form URL with base URL', async () => {
      const response = await request(app)
        .get(`/api/forms/${publishedFormId}/tokens/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const expectedBaseUrl =
        process.env.PUBLIC_BASE_URL || 'http://localhost:4200';
      expect(response.body.data.formUrl.startsWith(expectedBaseUrl)).toBe(true);
      expect(response.body.data.formUrl).toContain('/public/form/');
    });
  });

  describe('Form with permanent token', () => {
    let permanentFormId: string;

    beforeEach(async () => {
      // Create and publish a form with permanent token
      const createFormRes = await request(app)
        .post('/api/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Permanent Token Form',
          description: 'Form with permanent token',
          status: 'draft',
        })
        .expect(201);

      permanentFormId = createFormRes.body.data.id;

      // Create a form schema for the form
      const schemaData = generateFormSchemaData(permanentFormId);
      await formSchemasRepository.createSchema(permanentFormId, schemaData);

      // Publish the form without expiration (permanent token)
      await request(app)
        .post(`/api/forms/${permanentFormId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(200);
    });

    it('should return hasValidToken: true with null expiration for permanent token', async () => {
      const response = await request(app)
        .get(`/api/forms/${permanentFormId}/tokens/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasValidToken).toBe(true);
      expect(response.body.data.tokenExpiration).toBeNull();
      expect(response.body.data.tokenCreatedAt).toBeTruthy();
      expect(response.body.data.formUrl).toContain('/public/form/');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent form', async () => {
      const nonExistentFormId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/forms/${nonExistentFormId}/tokens/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 400 for invalid form ID format', async () => {
      await request(app)
        .get('/api/forms/invalid-uuid/tokens/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });
});
