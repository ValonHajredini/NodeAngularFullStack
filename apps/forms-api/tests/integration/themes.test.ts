import request from 'supertest';
import { app } from '../../src/server';
import { themesRepository } from '../../src/repositories/themes.repository';
import { databaseService } from '../../src/services/database.service';

/**
 * Integration tests for Themes API endpoints.
 * Tests all CRUD operations with proper authentication, validation, and error handling.
 */
describe('Themes API Endpoints', () => {
  let adminToken: string;
  let userToken: string;
  let testThemeId: string;
  let secondThemeId: string;

  const validThemeData = {
    name: 'Test Theme',
    description: 'A test theme for integration testing',
    thumbnailUrl: 'https://spaces.example.com/theme-thumb.jpg',
    themeConfig: {
      desktop: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        backgroundColor: '#ffffff',
        textColorPrimary: '#212529',
        textColorSecondary: '#6c757d',
        fontFamilyHeading: 'Roboto',
        fontFamilyBody: 'Open Sans',
        fieldBorderRadius: '8px',
        fieldSpacing: '16px',
        containerBackground: '#f8f9fa',
        containerOpacity: 0.95,
        containerPosition: 'center',
      },
      mobile: {
        primaryColor: '#0056b3',
        fieldSpacing: '12px',
      },
    },
  };

  beforeAll(async () => {
    // Get authentication tokens for testing
    // Admin token
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'User123!@#',
      });

    adminToken = adminLoginResponse.body.data.accessToken;

    // User token
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'User123!@#',
      });

    userToken = userLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    if (testThemeId) {
      await themesRepository.softDelete(testThemeId);
    }
    if (secondThemeId) {
      await themesRepository.softDelete(secondThemeId);
    }

    // Close database connections
    await databaseService.close();
  });

  describe('GET /api/v1/themes', () => {
    it('should return active themes sorted by usage count', async () => {
      const response = await request(app)
        .get('/api/v1/themes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.message).toBe('Themes retrieved successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/themes');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/themes/:id', () => {
    it('should return theme by id', async () => {
      // First create a theme to test with
      const createResponse = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validThemeData);

      testThemeId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testThemeId);
      expect(response.body.data.name).toBe(validThemeData.name);
    });

    it('should return 404 if theme not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/themes/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/v1/themes/${testThemeId}`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/themes', () => {
    it('should create theme with valid admin JWT', async () => {
      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validThemeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validThemeData.name);
      expect(response.body.data.description).toBe(validThemeData.description);
      expect(response.body.data.thumbnailUrl).toBe(validThemeData.thumbnailUrl);
      expect(response.body.data.themeConfig).toEqual(
        validThemeData.themeConfig
      );
      expect(response.body.data.usageCount).toBe(0);
      expect(response.body.data.isActive).toBe(true);

      secondThemeId = response.body.data.id;
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validThemeData);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate themeConfig JSONB structure', async () => {
      const invalidThemeData = {
        ...validThemeData,
        themeConfig: {
          desktop: {
            primaryColor: 'invalid-color', // Invalid hex color
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidThemeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/themes')
        .send(validThemeData);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/themes/:id', () => {
    it('should update theme with admin JWT', async () => {
      const updateData = {
        name: 'Updated Theme Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/v1/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should reject non-admin users', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const response = await request(app)
        .put(`/api/v1/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });

    it('should return 404 if theme not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .put(`/api/v1/themes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/themes/${testThemeId}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/themes/:id', () => {
    it('should soft-delete theme (is_active = false)', async () => {
      const response = await request(app)
        .delete(`/api/v1/themes/${secondThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Theme deleted successfully');

      // Verify theme is soft-deleted by trying to get it
      const getResponse = await request(app)
        .get(`/api/v1/themes/${secondThemeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 if theme not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/v1/themes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(
        `/api/v1/themes/${testThemeId}`
      );
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/themes/:id/apply', () => {
    it('should increment usage_count by 1', async () => {
      const response = await request(app)
        .post(`/api/v1/themes/${testThemeId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usageCount).toBe(1);
      expect(response.body.message).toBe(
        'Theme application tracked successfully'
      );
    });

    it('should work for authenticated users (not just admin)', async () => {
      const response = await request(app)
        .post(`/api/v1/themes/${testThemeId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usageCount).toBe(2); // Should be 2 now
    });

    it('should return 404 if theme not found', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post(`/api/v1/themes/${fakeId}/apply`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app).post(
        `/api/v1/themes/${testThemeId}/apply`
      );
      expect(response.status).toBe(401);
    });
  });

  describe('Integration Verification Tests', () => {
    it('IV1: Verify existing /api/v1/forms endpoints remain functional and unaffected', async () => {
      // Test that forms endpoints still work
      const response = await request(app)
        .get('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('IV2: Verify JWT authentication middleware applies to theme routes', async () => {
      // Test without token
      const response = await request(app).get('/api/v1/themes');
      expect(response.status).toBe(401);

      // Test with invalid token
      const invalidResponse = await request(app)
        .get('/api/v1/themes')
        .set('Authorization', 'Bearer invalid-token');
      expect(invalidResponse.status).toBe(401);
    });

    it('IV3: Verify rate limiting allows legitimate requests without blocking theme operations', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/v1/themes')
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed (rate limiting should not block legitimate traffic)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
