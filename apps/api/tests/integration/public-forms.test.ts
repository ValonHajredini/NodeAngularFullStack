import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { publicFormsRoutes } from '../../src/routes/public-forms.routes';
import { formsService } from '../../src/services/forms.service';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';
import { FormStatus, FormFieldType } from '@nodeangularfullstack/shared';
import { AppConfig } from '../../src/config/app.config';

describe('Public Forms API', () => {
  let app: express.Application;
  let testUserId: string;
  let testFormId: string;
  let testSchemaId: string;
  let validToken: string;
  let expiredToken: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Import and setup auth routes for user registration
    const authRoutes = (await import('../../src/routes/auth.routes')).default;
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/public', publicFormsRoutes);

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
        email: `publicformstest-${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'PublicForms',
        lastName: 'Test',
      });

    testUserId = registrationResponse.body.data.user.id;
  });

  beforeEach(async () => {
    // Create test form
    const form = await formsService.createForm(testUserId, undefined, {
      title: 'Test Public Form',
      description: 'Test form for public rendering',
      status: FormStatus.DRAFT,
    });
    testFormId = form.id;

    // Create test form schema
    const schema = await formSchemasRepository.createSchema(testFormId, {
      formId: testFormId,
      version: 1,
      fields: [
        {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Name',
          fieldName: 'name',
          required: true,
          order: 1,
        },
        {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Email',
          fieldName: 'email',
          required: true,
          order: 2,
        },
      ],
      settings: {
        layout: {
          columns: 2,
          spacing: 'medium',
        },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you for your submission!',
          allowMultipleSubmissions: true,
        },
      },
      isPublished: false,
    });
    testSchemaId = schema.id;

    // Generate valid token
    const secret = AppConfig.getFormRenderTokenSecret();
    validToken = jwt.sign(
      {
        formSchemaId: testSchemaId,
      },
      secret,
      { expiresIn: '30d' }
    );

    // Generate expired token
    expiredToken = jwt.sign(
      {
        formSchemaId: testSchemaId,
      },
      secret,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    // Publish the schema with the valid token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await formSchemasRepository.publishSchema(
      testSchemaId,
      validToken,
      expiresAt
    );
  });

  describe('GET /api/v1/public/forms/render/:token', () => {
    it('should return form schema with valid token', async () => {
      const response = await request(app)
        .get(`/api/v1/public/forms/render/${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Form schema retrieved successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.schema).toBeDefined();
      expect(response.body.data.schema.id).toBe(testSchemaId);
      expect(response.body.data.schema.formId).toBe(testFormId);
      expect(response.body.data.schema.isPublished).toBe(true);
      expect(response.body.data.schema.fields).toHaveLength(2);
      expect(response.body.data.settings).toBeDefined();
      expect(response.body.data.settings.layout.columns).toBe(2);
    });

    it('should return 404 for invalid token', async () => {
      const invalidToken = 'invalid-jwt-token';

      const response = await request(app)
        .get(`/api/v1/public/forms/render/${invalidToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid form link');
    });

    it('should return 410 for expired token', async () => {
      const response = await request(app)
        .get(`/api/v1/public/forms/render/${expiredToken}`)
        .expect(410);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('This form has expired');
    });

    it('should return 404 for non-existent schema', async () => {
      const secret = AppConfig.getFormRenderTokenSecret();
      const nonExistentToken = jwt.sign(
        {
          formSchemaId: '123e4567-e89b-12d3-a456-000000000000',
        },
        secret,
        { expiresIn: '30d' }
      );

      const response = await request(app)
        .get(`/api/v1/public/forms/render/${nonExistentToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Form not found');
    });

    it('should return 404 for unpublished schema', async () => {
      // Unpublish the schema
      await formSchemasRepository.unpublishSchema(testSchemaId);

      const response = await request(app)
        .get(`/api/v1/public/forms/render/${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Form not found');
    });

    it('should return 410 when token expires_at date has passed', async () => {
      // Update schema with expired date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const secret = AppConfig.getFormRenderTokenSecret();
      const tokenWithPastExpiry = jwt.sign(
        {
          formSchemaId: testSchemaId,
        },
        secret,
        { expiresIn: '30d' }
      );

      await formSchemasRepository.updateSchema(testSchemaId, {
        renderToken: tokenWithPastExpiry,
        expiresAt: pastDate,
      });

      const response = await request(app)
        .get(`/api/v1/public/forms/render/${tokenWithPastExpiry}`)
        .expect(410);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('This form has expired');
    });

    it('should not require authentication', async () => {
      // Call without Authorization header
      const response = await request(app)
        .get(`/api/v1/public/forms/render/${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
