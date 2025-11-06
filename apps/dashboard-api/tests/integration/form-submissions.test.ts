import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTestDatabase,
} from '../helpers/test-setup';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';

describe('Form Submissions API', () => {
  let authToken: string;
  let formId: string;
  let renderToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await databaseService.close();
  });

  beforeEach(async () => {
    // Clean database before each test to prevent rate limit issues from previous tests
    await cleanTestDatabase();

    // Register and login a test user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.data.accessToken;

    // Create a form
    const formResponse = await request(app)
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Contact Form',
        description: 'Test contact form',
        status: 'draft',
        schema: {
          fields: [
            {
              id: 'name',
              type: 'text',
              label: 'Name',
              fieldName: 'name',
              required: true,
              order: 1,
            },
            {
              id: 'email',
              type: 'email',
              label: 'Email',
              fieldName: 'email',
              required: true,
              order: 2,
            },
            {
              id: 'message',
              type: 'textarea',
              label: 'Message',
              fieldName: 'message',
              required: false,
              validation: {
                minLength: 10,
                maxLength: 500,
              },
              order: 3,
            },
          ],
          settings: {
            layout: {
              columns: 1,
              spacing: 'medium',
            },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you for your submission!',
              allowMultipleSubmissions: true,
            },
          },
        },
      });

    expect(formResponse.status).toBe(201);
    formId = formResponse.body.data.id;

    // Create a schema for the form (required before publishing)
    await formSchemasRepository.createSchema(formId, {
      formId,
      version: 1,
      fields: [
        {
          id: 'name',
          type: 'text' as any,
          label: 'Name',
          fieldName: 'name',
          required: true,
          order: 1,
        },
        {
          id: 'email',
          type: 'email' as any,
          label: 'Email',
          fieldName: 'email',
          required: true,
          order: 2,
        },
        {
          id: 'message',
          type: 'textarea' as any,
          label: 'Message',
          fieldName: 'message',
          required: false,
          validation: {
            minLength: 10,
            maxLength: 500,
          },
          order: 3,
        },
      ],
      settings: {
        layout: {
          columns: 1 as const,
          spacing: 'medium' as const,
        },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you for your submission!',
          allowMultipleSubmissions: true,
        },
      },
      isPublished: false,
    });

    // Publish the form
    const publishResponse = await request(app)
      .post(`/api/v1/forms/${formId}/publish`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        expiresInDays: 30,
      });

    expect(publishResponse.status).toBe(200);
    renderToken = publishResponse.body.data.renderUrl.split('/').pop();
  });

  describe('POST /api/v1/public/forms/submit/:token', () => {
    it('should submit a form with valid data', async () => {
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: 'John Doe',
            email: 'john@example.com',
            message: 'This is a test message with enough characters.',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Form submitted successfully');
      expect(response.body.data.submissionId).toBeDefined();
      expect(response.body.data.successMessage).toBe(
        'Thank you for your submission!'
      );
    });

    it('should reject submission with missing required field', async () => {
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            email: 'john@example.com',
            message: 'Missing name field.',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.name).toContain('required');
    });

    it('should reject submission with invalid email', async () => {
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: 'John Doe',
            email: 'invalid-email',
            message: 'Test message.',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.email).toContain('valid email');
    });

    it('should reject submission with message too short', async () => {
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: 'John Doe',
            email: 'john@example.com',
            message: 'Short',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.message).toContain('at least 10 characters');
    });

    it('should sanitize XSS in text fields', async () => {
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: '<script>alert("XSS")</script>John Doe',
            email: 'john@example.com',
            message: 'This is a test message with enough characters.',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify the submission was sanitized (script tags escaped)
      const submissionsResponse = await request(app)
        .get(`/api/v1/forms/${formId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(submissionsResponse.status).toBe(200);
      expect(submissionsResponse.body.data[0].values.name).not.toContain(
        '<script>'
      );
      expect(submissionsResponse.body.data[0].values.name).toContain(
        '&lt;script&gt;'
      );
    });

    it('should enforce rate limiting (10 submissions per hour)', async () => {
      // Submit 10 forms successfully
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post(`/api/v1/public/forms/submit/${renderToken}`)
          .send({
            values: {
              name: `User ${i}`,
              email: `user${i}@example.com`,
              message: 'Test message with enough characters here.',
            },
          });

        expect(response.status).toBe(201);
      }

      // 11th submission should be rate limited
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: 'Rate Limited User',
            email: 'limited@example.com',
            message: 'This should be rate limited now.',
          },
        });

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('Rate limit exceeded');
    });

    it('should reject submission with invalid token', async () => {
      const response = await request(app)
        .post('/api/public/forms/submit/invalid-token')
        .send({
          values: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject submission with fields not in schema', async () => {
      const response = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: 'John Doe',
            email: 'john@example.com',
            message: 'Test message.',
            invalidField: 'This should not be allowed',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.invalidField).toContain(
        'not found in form schema'
      );
    });
  });

  describe('GET /api/v1/forms/:id/submissions', () => {
    beforeEach(async () => {
      // Submit a few test submissions
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/v1/public/forms/submit/${renderToken}`)
          .send({
            values: {
              name: `User ${i}`,
              email: `user${i}@example.com`,
              message: `This is test message number ${i} with enough characters.`,
            },
          });
      }
    });

    it('should get submissions for form owner', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.total).toBe(5);

      // Verify IP masking (handles both IPv4 and IPv6-mapped IPv4)
      expect(response.body.data[0].submitterIp).toMatch(
        /^(::ffff:)?\d+\.\d+\._\._$/
      );
    });

    it('should paginate submissions correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it('should reject unauthorized access to submissions', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(401);
    });

    it('should reject access by non-owner', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'Other',
          lastName: 'User',
        });

      const otherToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions`)
        .set('Authorization', `Bearer ${otherToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('GET /api/v1/forms/:id/submissions/export', () => {
    beforeEach(async () => {
      // Submit test submissions
      await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({
          values: {
            name: 'Export User',
            email: 'export@example.com',
            message: 'This is a test message for CSV export.',
          },
        });
    });

    it('should export submissions as CSV for form owner', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        `form-submissions-${formId}.csv`
      );

      // Verify CSV content
      const csv = response.text;
      expect(csv).toContain('Submitted At');
      expect(csv).toContain('Submitter IP');
      expect(csv).toContain('Export User');
      expect(csv).toContain('export@example.com');
    });

    it('should reject CSV export for non-owner', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'Other',
          lastName: 'User',
        });

      const otherToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });
});
