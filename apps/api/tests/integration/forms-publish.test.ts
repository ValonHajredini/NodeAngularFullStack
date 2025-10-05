import request from 'supertest';
import express from 'express';
import { formsRoutes } from '../../src/routes/forms.routes';
import { formsService } from '../../src/services/forms.service';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { FormStatus } from '@nodeangularfullstack/shared';

/**
 * Integration tests for form publishing functionality.
 * Tests publish/unpublish endpoints with authentication and validation.
 */
describe('Forms Publishing Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  let testUserId: string;
  let testFormId: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Import and setup auth routes for user registration
    const authRoutes = (await import('../../src/routes/auth.routes')).default;
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/forms', formsRoutes);

    // Add error handling middleware
    app.use((err: any, _req: any, res: any, _next: any) => {
      console.error('Test error:', err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    });

    // Create a real test user via registration API
    const registrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `formspublishtest-${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'FormPublish',
        lastName: 'Test',
      });

    testUserId = registrationResponse.body.data.user.id;
    authToken = `Bearer ${registrationResponse.body.data.accessToken}`;

    // Mock authentication middleware to use real user
    jest
      .spyOn(AuthMiddleware, 'authenticate')
      .mockImplementation(async (req: any, _res, next) => {
        req.user = {
          id: testUserId,
          email: registrationResponse.body.data.user.email,
          role: 'user',
        };
        next();
      });
  });

  beforeEach(async () => {
    // Create a test form
    const formData = {
      title: 'Test Contact Form',
      description: 'Test form for publishing',
      status: FormStatus.DRAFT,
    };

    const mockForm = await formsService.createForm(
      testUserId,
      undefined,
      formData
    );
    testFormId = mockForm.id;

    // Create a test schema for the form
    const mockSchema = {
      formId: testFormId,
      version: 1,
      fields: [
        {
          id: 'field-1',
          type: 'text' as any,
          label: 'Name',
          fieldName: 'name',
          required: true,
          order: 0,
        },
        {
          id: 'field-2',
          type: 'email' as any,
          label: 'Email',
          fieldName: 'email',
          required: true,
          order: 1,
        },
      ],
      settings: {
        layout: { columns: 1 as const, spacing: 'medium' as const },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you!',
          allowMultipleSubmissions: true,
        },
      },
      isPublished: false,
    };

    await formSchemasRepository.createSchema(testFormId, mockSchema);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup is handled by database reset between test runs
    // Test user will be cleaned up automatically
  });

  describe('POST /api/forms/:id/publish', () => {
    it('should publish a form with valid data', async () => {
      const response = await request(app)
        .post(`/api/forms/${testFormId}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      if (response.status !== 200) {
        console.log('Error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Form published successfully');
      expect(response.body.data).toHaveProperty('form');
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data).toHaveProperty('renderUrl');
      expect(response.body.data.form.status).toBe(FormStatus.PUBLISHED);
      expect(response.body.data.schema.isPublished).toBe(true);
      expect(response.body.data.schema.renderToken).toBeDefined();
      expect(response.body.data.renderUrl).toContain('/forms/render/');
    });

    it('should reject publish with invalid expiration days', async () => {
      const response = await request(app)
        .post(`/api/forms/${testFormId}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 400 }); // Exceeds maximum of 365

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject publish for non-existent form', async () => {
      const response = await request(app)
        .post('/api/forms/non-existent-id/publish')
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(404);
    });

    it('should reject publish without authentication', async () => {
      const response = await request(app)
        .post(`/api/forms/${testFormId}/publish`)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(401);
    });

    it('should validate schema before publishing', async () => {
      // Create a form with invalid schema (duplicate field names)
      const formData = {
        title: 'Invalid Form',
        status: FormStatus.DRAFT,
      };
      const invalidForm = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const invalidSchema = {
        formId: invalidForm.id,
        version: 1,
        fields: [
          {
            id: 'field-1',
            type: 'text' as any,
            label: 'Name',
            fieldName: 'duplicate_name', // Duplicate
            required: true,
            order: 0,
          },
          {
            id: 'field-2',
            type: 'text' as any,
            label: 'Another Field',
            fieldName: 'duplicate_name', // Duplicate
            required: true,
            order: 1,
          },
        ],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
        },
        isPublished: false,
      };

      await formSchemasRepository.createSchema(invalidForm.id, invalidSchema);

      const response = await request(app)
        .post(`/api/forms/${invalidForm.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('validation failed');
    });

    it('should generate JWT token with correct payload', async () => {
      const response = await request(app)
        .post(`/api/forms/${testFormId}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(200);
      const renderToken = response.body.data.schema.renderToken;
      expect(renderToken).toBeDefined();

      // Token should be a JWT (has 3 parts separated by dots)
      const tokenParts = renderToken.split('.');
      expect(tokenParts).toHaveLength(3);
    });
  });

  describe('POST /api/forms/:id/unpublish', () => {
    beforeEach(async () => {
      // Publish the form first
      await request(app)
        .post(`/api/forms/${testFormId}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });
    });

    it('should unpublish a published form', async () => {
      const response = await request(app)
        .post(`/api/forms/${testFormId}/unpublish`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Form unpublished successfully');
      expect(response.body.data.status).toBe(FormStatus.DRAFT);
    });

    it('should reject unpublish for non-existent form', async () => {
      const response = await request(app)
        .post('/api/forms/non-existent-id/unpublish')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });

    it('should reject unpublish without authentication', async () => {
      const response = await request(app).post(
        `/api/forms/${testFormId}/unpublish`
      );

      expect(response.status).toBe(401);
    });

    it('should invalidate render token after unpublish', async () => {
      // Get the published schema
      const schemas = await formSchemasRepository.findByFormId(testFormId);
      const publishedSchema = schemas.find((s) => s.isPublished);
      expect(publishedSchema).toBeDefined();

      // Unpublish
      await request(app)
        .post(`/api/forms/${testFormId}/unpublish`)
        .set('Authorization', authToken);

      // Verify schema is unpublished
      const updatedSchemas =
        await formSchemasRepository.findByFormId(testFormId);
      const unpublishedSchema = updatedSchemas.find(
        (s) => s.id === publishedSchema!.id
      );
      expect(unpublishedSchema?.isPublished).toBe(false);
    });
  });

  describe('Schema Validation', () => {
    it('should reject publish when fields are missing labels', async () => {
      const formData = {
        title: 'Form Missing Labels',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'field-1',
            type: 'text' as any,
            label: '', // Empty label
            fieldName: 'name',
            required: true,
            order: 0,
          },
        ],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
        },
        isPublished: false,
      };

      await formSchemasRepository.createSchema(form.id, schema);

      const response = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(400);
    });

    it('should reject publish when regex patterns are invalid', async () => {
      const formData = {
        title: 'Form Invalid Regex',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'field-1',
            type: 'text' as any,
            label: 'Pattern Field',
            fieldName: 'pattern',
            required: true,
            order: 0,
            validation: {
              pattern: '[invalid(regex', // Invalid regex
            },
          },
        ],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
        },
        isPublished: false,
      };

      await formSchemasRepository.createSchema(form.id, schema);

      const response = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(400);
    });
  });
});
