import request from 'supertest';
import { app } from '../../src/server';
import { templatesRepository } from '../../src/repositories/templates.repository';
import { databaseService } from '../../src/services/database.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Integration tests for Templates API endpoints.
 * Tests all CRUD operations with proper authentication, validation, and error handling.
 */
describe('Templates API Endpoints', () => {
  let adminToken: string;
  let userToken: string;
  let testTemplateId: string;
  let secondTemplateId: string;

  const validTemplateData = {
    name: 'Product Order Form',
    description: 'Template for product order forms with inventory tracking',
    category: TemplateCategory.ECOMMERCE,
    templateSchema: {
      fields: [
        {
          id: 'field-1',
          label: 'Product Name',
          fieldName: 'product_name',
          type: 'text',
          required: true,
        },
        {
          id: 'field-2',
          label: 'Quantity',
          fieldName: 'quantity',
          type: 'number',
          required: true,
        },
      ],
      settings: {
        layout: {
          columns: 1,
        },
        submission: {
          submitButtonText: 'Submit Order',
          successMessage: 'Order submitted successfully',
        },
      },
    },
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_name',
      variantField: 'variant',
      quantityField: 'quantity',
      stockTable: 'product_inventory',
      decrementOnSubmit: true,
    },
    previewImageUrl: 'https://example.com/preview.png',
  };

  beforeAll(async () => {
    // Get authentication tokens for testing
    // Admin token
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!@#',
      });

    if (adminLoginResponse.status !== 200 || !adminLoginResponse.body.data) {
      throw new Error(
        `Admin login failed: ${adminLoginResponse.status} - ${JSON.stringify(adminLoginResponse.body)}`
      );
    }
    adminToken = adminLoginResponse.body.data.accessToken;

    // User token
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'User123!@#',
      });

    if (userLoginResponse.status !== 200 || !userLoginResponse.body.data) {
      throw new Error(
        `User login failed: ${userLoginResponse.status} - ${JSON.stringify(userLoginResponse.body)}`
      );
    }
    userToken = userLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    if (testTemplateId) {
      await templatesRepository.delete(testTemplateId);
    }
    if (secondTemplateId) {
      await templatesRepository.delete(secondTemplateId);
    }

    // Close database connections
    await databaseService.close();
  });

  describe('GET /api/v1/templates', () => {
    it('should return active templates without authentication (public endpoint)', async () => {
      const response = await request(app).get('/api/v1/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should filter templates by category', async () => {
      const response = await request(app).get(
        `/api/v1/templates?category=${TemplateCategory.ECOMMERCE}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should support pagination with page and limit', async () => {
      const response = await request(app).get(
        '/api/v1/templates?page=1&limit=5'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should return 400 for invalid category', async () => {
      const response = await request(app).get(
        '/api/v1/templates?category=invalid_category'
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    beforeAll(async () => {
      // Create a test template
      const createResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validTemplateData);

      testTemplateId = createResponse.body.data.id;
    });

    it('should return template by id without authentication (public endpoint)', async () => {
      const response = await request(app).get(
        `/api/v1/templates/${testTemplateId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTemplateId);
      expect(response.body.data.name).toBe(validTemplateData.name);
      expect(response.body.data.category).toBe(validTemplateData.category);
    });

    it('should return 404 if template not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app).get(`/api/v1/templates/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app).get('/api/v1/templates/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/templates', () => {
    it('should create template with valid admin JWT', async () => {
      const newTemplateData = {
        ...validTemplateData,
        name: 'Customer Survey Template',
        category: TemplateCategory.DATA_COLLECTION,
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTemplateData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template created successfully');
      expect(response.body.data.name).toBe(newTemplateData.name);
      expect(response.body.data.category).toBe(newTemplateData.category);
      expect(response.body.data.usageCount).toBe(0);
      expect(response.body.data.isActive).toBe(true);

      // Store for cleanup
      secondTemplateId = response.body.data.id;
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post('/api/v1/templates')
        .send(validTemplateData);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validTemplateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        description: 'Missing name and category',
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid template schema', async () => {
      const invalidData = {
        ...validTemplateData,
        templateSchema: {
          // Missing required fields array
          settings: {
            layout: { columns: 1 },
            submission: { submitButtonText: 'Submit' },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for template schema exceeding 100KB', async () => {
      // Create a large template schema > 100KB
      const largeFields = Array.from({ length: 500 }, (_, i) => ({
        id: `field-${i}`,
        label: `Field ${i}`.repeat(50), // Make it large
        fieldName: `field_${i}`,
        type: 'text',
        required: false,
      }));

      const largeTemplateData = {
        ...validTemplateData,
        templateSchema: {
          fields: largeFields,
          settings: validTemplateData.templateSchema.settings,
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeTemplateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid business logic config type', async () => {
      const invalidData = {
        ...validTemplateData,
        businessLogicConfig: {
          type: 'invalid_type',
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate quiz config has required fields', async () => {
      const invalidQuizData = {
        ...validTemplateData,
        category: TemplateCategory.QUIZ,
        businessLogicConfig: {
          type: 'quiz',
          // Missing scoringRules
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuizData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/templates/:id', () => {
    it('should update template with valid admin JWT', async () => {
      const updateData = {
        name: 'Updated Product Order Form',
        description: 'Updated description for product order form',
      };

      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/v1/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });

    it('should return 404 if template not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .put(`/api/v1/templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .put('/api/v1/templates/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/templates/:id', () => {
    let templateToDelete: string;

    beforeEach(async () => {
      // Create a template to delete
      const createResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validTemplateData,
          name: 'Template to Delete',
        });

      templateToDelete = createResponse.body.data.id;
    });

    it('should soft delete template with valid admin JWT', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${templateToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template deleted successfully');

      // Verify template is no longer accessible (soft deleted)
      const getResponse = await request(app).get(
        `/api/v1/templates/${templateToDelete}`
      );
      expect(getResponse.status).toBe(404);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app).delete(
        `/api/v1/templates/${templateToDelete}`
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${templateToDelete}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 if template not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/v1/templates/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/templates/:id/apply', () => {
    it('should apply template with valid JWT authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.fields).toBeInstanceOf(Array);
      expect(response.body.data.settings).toBeDefined();

      // Verify usage count incremented
      const getResponse = await request(app).get(
        `/api/v1/templates/${testTemplateId}`
      );
      expect(getResponse.body.data.usageCount).toBeGreaterThan(0);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app).post(
        `/api/v1/templates/${testTemplateId}/apply`
      );

      expect(response.status).toBe(401);
    });

    it('should allow any authenticated user to apply template', async () => {
      const response = await request(app)
        .post(`/api/v1/templates/${testTemplateId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if template not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/v1/templates/${fakeId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for inactive template', async () => {
      // Create and immediately soft delete a template
      const createResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validTemplateData,
          name: 'Inactive Template',
        });

      const inactiveTemplateId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/v1/templates/${inactiveTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const response = await request(app)
        .post(`/api/v1/templates/${inactiveTemplateId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
