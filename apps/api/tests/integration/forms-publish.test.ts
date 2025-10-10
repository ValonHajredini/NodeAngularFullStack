import request from 'supertest';
import express from 'express';
import { formsRoutes } from '../../src/routes/forms.routes';
import { publicFormsRoutes } from '../../src/routes/public-forms.routes';
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

      const schema: any = {
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

      const schema: any = {
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

  describe('IMAGE Field Type Integration', () => {
    it('should publish a form with IMAGE field and preserve metadata', async () => {
      const formData = {
        title: 'Form with Image',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema: any = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'field-1',
            type: 'image' as any,
            label: 'Company Logo',
            fieldName: 'company_logo',
            required: false,
            order: 0,
            metadata: {
              imageUrl: 'https://cdn.example.com/logo.jpg',
              altText: 'Company Logo',
              alignment: 'center' as const,
              width: '100%',
              height: 'auto',
              objectFit: 'contain' as const,
              caption: 'Our company logo',
            },
          },
          {
            id: 'field-2',
            type: 'text' as any,
            label: 'Name',
            fieldName: 'name',
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

      await formSchemasRepository.createSchema(form.id, schema);

      const response = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.form.status).toBe(FormStatus.PUBLISHED);

      // Verify IMAGE field metadata is preserved
      const publishedSchema = response.body.data.schema;
      const imageField = publishedSchema.fields.find(
        (f: any) => f.type === 'image'
      );
      expect(imageField).toBeDefined();
      expect(imageField.metadata).toEqual({
        imageUrl: 'https://cdn.example.com/logo.jpg',
        altText: 'Company Logo',
        alignment: 'center' as const,
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
        caption: 'Our company logo',
      });
    });

    it('should accept IMAGE field without imageUrl (placeholder)', async () => {
      const formData = {
        title: 'Form with Placeholder Image',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema: any = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'field-1',
            type: 'image' as any,
            label: 'Image Placeholder',
            fieldName: 'image_placeholder',
            required: false,
            order: 0,
            metadata: {
              altText: 'Placeholder image',
              alignment: 'center' as const,
            },
          },
          {
            id: 'field-2',
            type: 'text' as any,
            label: 'Name',
            fieldName: 'name',
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

      await formSchemasRepository.createSchema(form.id, schema);

      const response = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow IMAGE field with different alignment options', async () => {
      const alignments = ['left', 'center', 'right', 'full'];

      for (const alignment of alignments) {
        const formData = {
          title: `Form with ${alignment} aligned image`,
          status: FormStatus.DRAFT,
        };
        const form = await formsService.createForm(
          testUserId,
          undefined,
          formData
        );

        const schema: any = {
          formId: form.id,
          version: 1,
          fields: [
            {
              id: 'field-1',
              type: 'image' as any,
              label: 'Aligned Image',
              fieldName: 'aligned_image',
              required: false,
              order: 0,
              metadata: {
                imageUrl: 'https://cdn.example.com/image.jpg',
                altText: 'Test image',
                alignment: alignment as any,
              },
            },
            {
              id: 'field-2',
              type: 'text' as any,
              label: 'Name',
              fieldName: 'name',
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

        await formSchemasRepository.createSchema(form.id, schema);

        const response = await request(app)
          .post(`/api/forms/${form.id}/publish`)
          .set('Authorization', authToken)
          .send({ expiresInDays: 30 });

        expect(response.status).toBe(200);

        const publishedSchema = response.body.data.schema;
        const imageField = publishedSchema.fields.find(
          (f: any) => f.type === 'image'
        );
        expect(imageField.metadata.alignment).toBe(alignment);
      }
    });

    it('should allow IMAGE field with different objectFit options', async () => {
      const objectFits = ['contain', 'cover', 'fill', 'none'];

      for (const objectFit of objectFits) {
        const formData = {
          title: `Form with ${objectFit} objectFit`,
          status: FormStatus.DRAFT,
        };
        const form = await formsService.createForm(
          testUserId,
          undefined,
          formData
        );

        const schema: any = {
          formId: form.id,
          version: 1,
          fields: [
            {
              id: 'field-1',
              type: 'image' as any,
              label: 'Image with ObjectFit',
              fieldName: 'objectfit_image',
              required: false,
              order: 0,
              metadata: {
                imageUrl: 'https://cdn.example.com/image.jpg',
                altText: 'Test image',
                objectFit: objectFit as any,
              },
            },
            {
              id: 'field-2',
              type: 'text' as any,
              label: 'Name',
              fieldName: 'name',
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

        await formSchemasRepository.createSchema(form.id, schema);

        const response = await request(app)
          .post(`/api/forms/${form.id}/publish`)
          .set('Authorization', authToken)
          .send({ expiresInDays: 30 });

        expect(response.status).toBe(200);

        const publishedSchema = response.body.data.schema;
        const imageField = publishedSchema.fields.find(
          (f: any) => f.type === 'image'
        );
        expect(imageField.metadata.objectFit).toBe(objectFit);
      }
    });

    it('should preserve IMAGE dimensions in published schema', async () => {
      const formData = {
        title: 'Form with Sized Image',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema: any = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'field-1',
            type: 'image' as any,
            label: 'Sized Image',
            fieldName: 'sized_image',
            required: false,
            order: 0,
            metadata: {
              imageUrl: 'https://cdn.example.com/banner.jpg',
              altText: 'Banner image',
              width: 800,
              height: 200,
            },
          },
          {
            id: 'field-2',
            type: 'text' as any,
            label: 'Name',
            fieldName: 'name',
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

      await formSchemasRepository.createSchema(form.id, schema);

      const response = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(200);

      const publishedSchema = response.body.data.schema;
      const imageField = publishedSchema.fields.find(
        (f: any) => f.type === 'image'
      );
      expect(imageField.metadata.width).toBe(800);
      expect(imageField.metadata.height).toBe(200);
    });
  });

  describe('TEXT_BLOCK Field Data Exclusion (Story 15.3)', () => {
    it('should exclude TEXT_BLOCK fields from form submission data', async () => {
      // Create a form with TEXT_BLOCK and input fields
      const formData = {
        title: 'Form with TEXT_BLOCK',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema: any = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'text-block-1',
            type: 'text_block' as any,
            label: 'Instructions',
            fieldName: 'text-block-instructions',
            required: false,
            order: 0,
            metadata: {
              content:
                '<p><strong>Important:</strong> Please fill out the form below.</p>',
              alignment: 'left' as const,
              padding: 'medium' as const,
            },
          },
          {
            id: 'field-name',
            type: 'text' as any,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 1,
          },
          {
            id: 'text-block-2',
            type: 'text_block' as any,
            label: 'Disclaimer',
            fieldName: 'text-block-disclaimer',
            required: false,
            order: 2,
            metadata: {
              content: '<p>By submitting, you agree to our terms.</p>',
              alignment: 'center' as const,
              padding: 'small' as const,
            },
          },
          {
            id: 'field-email',
            type: 'email' as any,
            label: 'Email',
            fieldName: 'email',
            required: true,
            order: 3,
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

      await formSchemasRepository.createSchema(form.id, schema);

      // Publish the form
      const publishResponse = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(publishResponse.status).toBe(200);
      const renderToken = publishResponse.body.data.schema.renderToken;

      // Submit the form with data for both TEXT_BLOCK and input fields
      const submissionData = {
        'text-block-instructions': 'This should be ignored',
        name: 'John Doe',
        'text-block-disclaimer': 'This should also be ignored',
        email: 'john@example.com',
      };

      const submitResponse = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({ formData: submissionData });

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.message).toBe('Form submitted successfully');

      // Verify TEXT_BLOCK fields are excluded from stored submission data
      const storedData = submitResponse.body.data.formData;
      expect(storedData).toHaveProperty('name', 'John Doe');
      expect(storedData).toHaveProperty('email', 'john@example.com');
      expect(storedData).not.toHaveProperty('text-block-instructions');
      expect(storedData).not.toHaveProperty('text-block-disclaimer');

      // Verify only 2 fields in submission (name and email)
      expect(Object.keys(storedData).length).toBe(2);
    });

    it('should handle forms with only TEXT_BLOCK fields (no data submission)', async () => {
      // Create a form with ONLY TEXT_BLOCK fields (display-only form)
      const formData = {
        title: 'Display Only Form',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema: any = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'text-block-1',
            type: 'text_block' as any,
            label: 'Announcement',
            fieldName: 'text-block-announcement',
            required: false,
            order: 0,
            metadata: {
              content:
                '<h3>Event Cancelled</h3><p>The event has been cancelled.</p>',
              alignment: 'center' as const,
              padding: 'large' as const,
            },
          },
          {
            id: 'text-block-2',
            type: 'text_block' as any,
            label: 'Footer',
            fieldName: 'text-block-footer',
            required: false,
            order: 1,
            metadata: {
              content: '<p>For questions, contact support@example.com</p>',
              alignment: 'left' as const,
              padding: 'small' as const,
            },
          },
        ],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Acknowledged',
            allowMultipleSubmissions: true,
          },
        },
        isPublished: false,
      };

      await formSchemasRepository.createSchema(form.id, schema);

      // Publish the form
      const publishResponse = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(publishResponse.status).toBe(200);
      const renderToken = publishResponse.body.data.schema.renderToken;

      // Submit with empty data (or TEXT_BLOCK data that should be ignored)
      const submissionData = {
        'text-block-announcement': 'Ignored data',
        'text-block-footer': 'Also ignored',
      };

      const submitResponse = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({ formData: submissionData });

      expect(submitResponse.status).toBe(201);

      // Verify submission data is empty (all TEXT_BLOCK data excluded)
      const storedData = submitResponse.body.data.formData;
      expect(storedData).toEqual({});
      expect(Object.keys(storedData).length).toBe(0);
    });

    it('should exclude HEADING and IMAGE fields alongside TEXT_BLOCK', async () => {
      // Create a form with multiple display field types
      const formData = {
        title: 'Mixed Display Fields Form',
        status: FormStatus.DRAFT,
      };
      const form = await formsService.createForm(
        testUserId,
        undefined,
        formData
      );

      const schema: any = {
        formId: form.id,
        version: 1,
        fields: [
          {
            id: 'heading-1',
            type: 'heading' as any,
            label: 'Form Title',
            fieldName: 'heading-title',
            required: false,
            order: 0,
            metadata: {
              level: 'h2' as const,
              text: 'Registration Form',
            },
          },
          {
            id: 'text-block-1',
            type: 'text_block' as any,
            label: 'Instructions',
            fieldName: 'text-block-instructions',
            required: false,
            order: 1,
            metadata: {
              content: '<p>Fill out the form below to register.</p>',
              alignment: 'left' as const,
              padding: 'medium' as const,
            },
          },
          {
            id: 'field-username',
            type: 'text' as any,
            label: 'Username',
            fieldName: 'username',
            required: true,
            order: 2,
          },
          {
            id: 'image-1',
            type: 'image' as any,
            label: 'Logo',
            fieldName: 'image-logo',
            required: false,
            order: 3,
            metadata: {
              imageUrl: 'https://example.com/logo.png',
              altText: 'Company Logo',
              size: 'medium' as const,
            },
          },
          {
            id: 'field-password',
            type: 'text' as any,
            label: 'Password',
            fieldName: 'password',
            required: true,
            order: 4,
          },
        ],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Registered!',
            allowMultipleSubmissions: false,
          },
        },
        isPublished: false,
      };

      await formSchemasRepository.createSchema(form.id, schema);

      // Publish the form
      const publishResponse = await request(app)
        .post(`/api/forms/${form.id}/publish`)
        .set('Authorization', authToken)
        .send({ expiresInDays: 30 });

      expect(publishResponse.status).toBe(200);
      const renderToken = publishResponse.body.data.schema.renderToken;

      // Submit with data for all fields (including display fields)
      const submissionData = {
        'heading-title': 'Ignored heading',
        'text-block-instructions': 'Ignored instructions',
        username: 'testuser',
        'image-logo': 'Ignored image',
        password: 'SecurePass123',
      };

      const submitResponse = await request(app)
        .post(`/api/v1/public/forms/submit/${renderToken}`)
        .send({ formData: submissionData });

      expect(submitResponse.status).toBe(201);

      // Verify only input fields are in submission
      const storedData = submitResponse.body.data.formData;
      expect(storedData).toHaveProperty('username', 'testuser');
      expect(storedData).toHaveProperty('password', 'SecurePass123');
      expect(storedData).not.toHaveProperty('heading-title');
      expect(storedData).not.toHaveProperty('text-block-instructions');
      expect(storedData).not.toHaveProperty('image-logo');

      // Verify exactly 2 fields in submission
      expect(Object.keys(storedData).length).toBe(2);
    });
  });
});
