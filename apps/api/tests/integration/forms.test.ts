import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import { FormStatus } from '@nodeangularfullstack/shared';

describe('Forms API Endpoints', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;

  beforeAll(async () => {
    // Register test users
    const userRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'formuser@example.com',
        password: 'TestPass123!',
        firstName: 'Form',
        lastName: 'User',
      });

    userId = userRegistrationResponse.body.data.user.id;

    const adminRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'formadmin@example.com',
        password: 'AdminPass123!',
        firstName: 'Form',
        lastName: 'Admin',
      });

    adminId = adminRegistrationResponse.body.data.user.id;

    // Manually update admin role in database
    const client = await databaseService.getPool().connect();
    try {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', [
        'admin',
        adminId,
      ]);
    } finally {
      client.release();
    }

    // Login to get valid JWT tokens
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'formuser@example.com',
        password: 'TestPass123!',
      });

    userToken = userLoginResponse.body.data.accessToken;

    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'formadmin@example.com',
        password: 'AdminPass123!',
      });

    adminToken = adminLoginResponse.body.data.accessToken;

    // Debug: Verify tokens are set
    if (!userToken || !adminToken) {
      console.error('Token setup failed!');
      console.error('User token:', userToken);
      console.error('Admin token:', adminToken);
      console.error(
        'User login response:',
        JSON.stringify(userLoginResponse.body, null, 2)
      );
      console.error(
        'Admin login response:',
        JSON.stringify(adminLoginResponse.body, null, 2)
      );
    }
  });

  afterAll(async () => {
    // Clean up test data
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        'DELETE FROM form_schemas WHERE form_id IN (SELECT id FROM forms WHERE user_id = $1 OR user_id = $2)',
        [userId, adminId]
      );
      await client.query(
        'DELETE FROM forms WHERE user_id = $1 OR user_id = $2',
        [userId, adminId]
      );
      await client.query('DELETE FROM sessions');
      await client.query(
        "DELETE FROM users WHERE email LIKE '%formuser%' OR email LIKE '%formadmin%'"
      );
    } finally {
      client.release();
    }

    // Clean up database connection
    await databaseService.close();
  });

  beforeEach(async () => {
    // Clean up forms before each test
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        'DELETE FROM form_schemas WHERE form_id IN (SELECT id FROM forms WHERE user_id = $1 OR user_id = $2)',
        [userId, adminId]
      );
      await client.query(
        'DELETE FROM forms WHERE user_id = $1 OR user_id = $2',
        [userId, adminId]
      );
    } finally {
      client.release();
    }
  });

  describe('POST /api/v1/forms', () => {
    const validFormData = {
      title: 'Contact Form',
      description: 'Customer feedback form',
      status: FormStatus.DRAFT,
    };

    it('should create a new form with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validFormData);

      // Debug: log response if not 201
      if (response.status !== 201) {
        console.error('Expected 201, got:', response.status);
        console.error('Response body:', JSON.stringify(response.body, null, 2));
        console.error('User token:', userToken?.substring(0, 50) + '...');
      }

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Form created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(validFormData.title);
      expect(response.body.data.description).toBe(validFormData.description);
      expect(response.body.data.status).toBe(validFormData.status);
      expect(response.body.data.userId).toBe(userId);
    });

    it('should create form with minimal required data (title only)', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Minimal Form' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Minimal Form');
      expect(response.body.data.status).toBe(FormStatus.DRAFT);
    });

    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'Form without title' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for title exceeding 200 characters', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'A'.repeat(201),
          description: 'Valid description',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for description exceeding 2000 characters', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Valid Title',
          description: 'A'.repeat(2001),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .send(validFormData)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should sanitize XSS attempts in title', async () => {
      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '<script>alert("xss")</script>Contact Form',
          description: 'Safe description',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SECURITY_ERROR');
    });
  });

  describe('GET /api/v1/forms', () => {
    beforeEach(async () => {
      // Create test forms for the user
      await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'User Form 1', description: 'First form' });

      await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'User Form 2', description: 'Second form' });

      // Create a form for the admin
      await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Form', description: 'Admin form' });
    });

    it("should return user's own forms only", async () => {
      const response = await request(app)
        .get('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(
        response.body.data.every((form: any) => form.userId === userId)
      ).toBe(true);
    });

    it('should return only admin own forms in non-tenant mode', async () => {
      const response = await request(app)
        .get('/api/v1/forms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      // In non-tenant mode, admin sees only their own form (1 form created in beforeEach)
      expect(response.body.data.length).toBe(1);
      expect(
        response.body.data.every((form: any) => form.userId === adminId)
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/forms?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/v1/forms').expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/v1/forms/:id', () => {
    let testFormId: string;

    beforeEach(async () => {
      // Create a test form
      const formResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Test Form', description: 'Test description' });

      testFormId = formResponse.body.data.id;
    });

    it('should return form for owner', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testFormId);
      expect(response.body.data.title).toBe('Test Form');
    });

    it('should return 403 for admin trying to access another user form in non-tenant mode', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-owner non-admin', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'TestPass123!',
          firstName: 'Other',
          lastName: 'User',
        });

      const otherUserToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for invalid form ID', async () => {
      const response = await request(app)
        .get('/api/v1/forms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for malformed UUID', async () => {
      const response = await request(app)
        .get('/api/v1/forms/invalid-uuid')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/forms/:id', () => {
    let testFormId: string;

    beforeEach(async () => {
      // Create a test form
      const formResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Original Title', description: 'Original description' });

      testFormId = formResponse.body.data.id;
    });

    it('should update form for owner', async () => {
      const response = await request(app)
        .put(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          status: FormStatus.PUBLISHED,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.status).toBe(FormStatus.PUBLISHED);
    });

    it('should return 403 for admin trying to update another user form in non-tenant mode', async () => {
      const response = await request(app)
        .put(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Title' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-owner', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'updatetest@example.com',
          password: 'TestPass123!',
          firstName: 'Update',
          lastName: 'Test',
        });

      const otherUserToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .put(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacker Title' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app)
        .put(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'A'.repeat(201) })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent form', async () => {
      const response = await request(app)
        .put('/api/v1/forms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/forms/:id', () => {
    let testFormId: string;

    beforeEach(async () => {
      // Create a test form
      const formResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Form to Delete', description: 'Will be deleted' });

      testFormId = formResponse.body.data.id;
    });

    it('should delete form for owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify form is deleted
      const getResponse = await request(app)
        .get(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(getResponse.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 for admin trying to delete another user form in non-tenant mode', async () => {
      const response = await request(app)
        .delete(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-owner', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'deletetest@example.com',
          password: 'TestPass123!',
          firstName: 'Delete',
          lastName: 'Test',
        });

      const otherUserToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .delete(`/api/v1/forms/${testFormId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent form', async () => {
      const response = await request(app)
        .delete('/api/v1/forms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .delete('/api/v1/forms/invalid-uuid')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Existing Routes Regression Tests', () => {
    it('should not affect health check endpoint', async () => {
      const response = await request(app).get('/api/v1/health');

      // Health endpoint exists in separate routes, but we verify it's not broken
      expect(response.status).not.toBe(500);
    });

    it('should not affect authentication endpoints', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'formuser@example.com',
        password: 'TestPass123!',
      });

      expect(response.status).not.toBe(500);
      expect(response.body).toHaveProperty('data');
    });
  });
});
