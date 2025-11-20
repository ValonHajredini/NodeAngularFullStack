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

    it('should include theme in response when form has theme (Story 20.7)', async () => {
      // Create a theme
      const { themesRepository } = await import(
        '../../src/repositories/themes.repository'
      );
      const theme = await themesRepository.create({
        name: 'Test Theme',
        description: 'Test theme for integration test',
        thumbnailUrl: 'https://example.com/theme-test.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Georgia, serif',
            fieldBorderRadius: '4px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
          mobile: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
          },
        },
      });

      // Update schema to use the theme
      await formSchemasRepository.updateSchema(testSchemaId, {
        themeId: theme.id,
      });

      // Fetch form schema
      const response = await request(app)
        .get(`/api/v1/public/forms/render/${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBeDefined();
      expect(response.body.data.theme.id).toBe(theme.id);
      expect(response.body.data.theme.name).toBe('Test Theme');
      expect(response.body.data.theme.themeConfig).toBeDefined();
      expect(response.body.data.theme.themeConfig.desktop).toBeDefined();
      expect(response.body.data.theme.themeConfig.desktop.primaryColor).toBe(
        '#007bff'
      );
    });

    it('should return null theme when form has no theme (Story 20.7)', async () => {
      const response = await request(app)
        .get(`/api/v1/public/forms/render/${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.theme).toBeNull();
    });
  });

  describe('GET /api/v1/public/forms/:shortCode (Story 20.7)', () => {
    let testShortCode: string;

    beforeEach(async () => {
      // Create a short link for the form schema
      const { shortLinksRepository } = await import(
        '../../src/repositories/short-links.repository'
      );
      testShortCode = `test-${Date.now()}`;

      await shortLinksRepository.create({
        code: testShortCode,
        originalUrl: `https://example.com/form/${testSchemaId}`,
        createdBy: testUserId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Update short link to reference the form schema
      const { databaseService } = await import(
        '../../src/services/database.service'
      );
      const pool = databaseService.getPool();
      await pool.query(
        'UPDATE short_links SET form_schema_id = $1 WHERE code = $2',
        [testSchemaId, testShortCode]
      );
    });

    it('should return form schema with theme by short code', async () => {
      // Create a theme
      const { themesRepository } = await import(
        '../../src/repositories/themes.repository'
      );
      const theme = await themesRepository.create({
        name: 'Short Code Test Theme',
        description: 'Test theme for short code endpoint',
        thumbnailUrl: 'https://example.com/theme-shortcode.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#28a745',
            secondaryColor: '#17a2b8',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Helvetica, sans-serif',
            fontFamilyBody: 'Times New Roman, serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '20px',
            containerBackground: '#e9ecef',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
      });

      // Update schema to use the theme
      await formSchemasRepository.updateSchema(testSchemaId, {
        themeId: theme.id,
      });

      // Fetch form by short code
      const response = await request(app)
        .get(`/api/v1/public/forms/${testShortCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Form schema retrieved successfully');
      expect(response.body.form).toBeDefined();
      expect(response.body.form.id).toBe(testSchemaId);
      expect(response.body.form.schema).toBeDefined();
      expect(response.body.form.settings).toBeDefined();
      expect(response.body.form.theme).toBeDefined();
      expect(response.body.form.theme.id).toBe(theme.id);
      expect(response.body.form.theme.name).toBe('Short Code Test Theme');
      expect(response.body.form.theme.themeConfig.desktop.primaryColor).toBe(
        '#28a745'
      );
      expect(response.body.form.shortCode).toBe(testShortCode);
    });

    it('should return null theme when form has no theme', async () => {
      const response = await request(app)
        .get(`/api/v1/public/forms/${testShortCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.form.theme).toBeNull();
    });

    it('should return 404 for non-existent short code', async () => {
      const response = await request(app)
        .get('/api/v1/public/forms/nonexistent-code')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Form not found');
    });

    it('should return 404 for expired short link', async () => {
      // Update short link with expired date
      // Note: Expired short_links are filtered in the query, so they return 404 (not found), not 410 (gone)
      const { databaseService } = await import(
        '../../src/services/database.service'
      );
      const pool = databaseService.getPool();
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      await pool.query(
        'UPDATE short_links SET expires_at = $1 WHERE code = $2',
        [pastDate, testShortCode]
      );

      const response = await request(app)
        .get(`/api/v1/public/forms/${testShortCode}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Form not found');
    });

    it('should gracefully handle deleted theme (AC: 5)', async () => {
      // Create and then delete a theme
      const { themesRepository } = await import(
        '../../src/repositories/themes.repository'
      );
      const theme = await themesRepository.create({
        name: 'Deleted Theme',
        description: 'Theme to be deleted',
        thumbnailUrl: 'https://example.com/theme-deleted.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#dc3545',
            secondaryColor: '#ffc107',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Georgia, serif',
            fieldBorderRadius: '4px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
        },
      });

      // Update schema to use the theme
      await formSchemasRepository.updateSchema(testSchemaId, {
        themeId: theme.id,
      });

      // Delete the theme
      await themesRepository.softDelete(theme.id);

      // Fetch form by short code - should return null theme gracefully
      const response = await request(app)
        .get(`/api/v1/public/forms/${testShortCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.form.theme).toBeNull();
      expect(response.body.form.settings.themeId).toBe(theme.id); // Theme ID still in settings
    });

    it('should not require authentication', async () => {
      // Call without Authorization header
      const response = await request(app)
        .get(`/api/v1/public/forms/${testShortCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
