import request from 'supertest';
import { app } from '../../src/server';
import { themesRepository } from '../../src/repositories/themes.repository';
import { databaseService } from '../../src/services/database.service';

/**
 * Integration tests for Admin Themes API endpoints.
 * Tests enhanced validation, security, accessibility, and admin-only access controls.
 */
describe('Admin Themes API Endpoints (/api/v1/admin/themes)', () => {
  let adminToken: string;
  let userToken: string;
  let testThemeId: string;

  const generateUniqueThemeData = () => ({
    name: `Admin Test Theme ${Date.now()}`,
    description: 'A test theme for admin API integration testing',
    primaryColor: '#1a73e8',
    secondaryColor: '#34a853',
    backgroundColor: '#ffffff',
    fontHeading: 'Roboto, sans-serif',
    fontBody: 'Open Sans, sans-serif',
    thumbnailUrl: 'https://spaces.example.com/admin-theme-thumb.jpg',
  });

  const invalidThemeData = {
    name: 'In', // Too short
    primaryColor: 'invalid-color',
    secondaryColor: '#ff0000',
    backgroundColor: 'javascript:alert("xss")', // Malicious CSS
    fontHeading: 'Comic Sans MS',
    fontBody: 'Times New Roman',
  };

  const lowContrastThemeData = {
    name: 'Low Contrast Theme',
    primaryColor: '#f0f0f0', // Very light gray
    secondaryColor: '#34a853',
    backgroundColor: '#ffffff', // White background with light gray text = poor contrast
    fontHeading: 'Roboto, sans-serif',
    fontBody: 'Open Sans, sans-serif',
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

    expect(adminLoginResponse.status).toBe(200);
    adminToken = adminLoginResponse.body.data.accessToken;

    // Regular user token
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'User123!@#',
      });

    expect(userLoginResponse.status).toBe(200);
    userToken = userLoginResponse.body.data.accessToken;
  });

  afterEach(async () => {
    // Clean up any test themes created during tests
    if (testThemeId) {
      try {
        await themesRepository.delete(testThemeId);
      } catch (error) {
        // Theme might already be deleted
      }
      testThemeId = '';
    }
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('POST /api/v1/admin/themes', () => {
    it('should create a new theme with admin authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateUniqueThemeData());

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Theme created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toContain('Admin Test Theme');
      expect(response.body.data.isCustom).toBe(true);

      testThemeId = response.body.data.id;
    });

    it('should reject theme creation without admin privileges', async () => {
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(generateUniqueThemeData());

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should reject theme creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .send(generateUniqueThemeData());

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject theme with invalid validation data', async () => {
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidThemeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should reject theme with malicious CSS', async () => {
      const maliciousTheme = {
        ...generateUniqueThemeData(),
        backgroundColor: 'javascript:alert("xss")',
      };

      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousTheme);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(
        response.body.error.details.some(
          (detail: any) =>
            detail.msg.includes('malicious CSS') ||
            detail.msg.includes('safe CSS gradient')
        )
      ).toBe(true);
    });

    it('should reject theme with poor accessibility contrast', async () => {
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(lowContrastThemeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(
        response.body.error.details.some(
          (detail: any) =>
            detail.msg.includes('contrast ratio') &&
            detail.msg.includes('accessibility')
        )
      ).toBe(true);
    });

    it('should reject theme exceeding size limit', async () => {
      // Create a theme with a very large description to exceed 50KB
      const largeDescription = 'A'.repeat(51 * 1024); // 51KB description
      const oversizedTheme = {
        ...generateUniqueThemeData(),
        description: largeDescription,
      };

      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(oversizedTheme);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(
        response.body.error.details.some((detail: any) =>
          detail.msg.includes('exceeds maximum allowed size')
        )
      ).toBe(true);
    });

    it('should accept valid CSS gradients', async () => {
      const gradientTheme = {
        ...generateUniqueThemeData(),
        backgroundColor: 'linear-gradient(135deg, #f8f9fa 0%, #e8eaed 100%)',
      };

      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gradientTheme);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      testThemeId = response.body.data.id;
    });
  });

  describe('GET /api/v1/admin/themes', () => {
    beforeEach(async () => {
      // Create a test theme
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateUniqueThemeData());

      testThemeId = response.body.data.id;
    });

    it('should list all themes for admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/admin/themes');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/v1/admin/themes/:id', () => {
    beforeEach(async () => {
      // Create a test theme
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateUniqueThemeData());

      testThemeId = response.body.data.id;
    });

    it('should get theme by ID for admin users', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testThemeId);
      expect(response.body.data.name).toContain('Admin Test Theme');
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent theme', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/v1/admin/themes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/v1/admin/themes/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/admin/themes/:id', () => {
    beforeEach(async () => {
      // Create a test theme
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateUniqueThemeData());

      testThemeId = response.body.data.id;
    });

    it('should update theme for admin users', async () => {
      const updateData = {
        name: `Updated Admin Theme ${Date.now()}`,
        description: 'Updated description',
        primaryColor: '#2196f3',
      };

      const response = await request(app)
        .put(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should reject non-admin users', async () => {
      const updateData = { name: 'Updated Theme' };

      const response = await request(app)
        .put(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should reject updates with accessibility violations', async () => {
      const updateData = {
        primaryColor: '#f0f0f0', // Light gray
        backgroundColor: '#ffffff', // White background = poor contrast
      };

      const response = await request(app)
        .put(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(
        response.body.error.details.some((detail: any) =>
          detail.msg.includes('contrast ratio')
        )
      ).toBe(true);
    });

    it('should reject updates with malicious CSS', async () => {
      const updateData = {
        backgroundColor: 'url(javascript:alert("xss"))',
      };

      const response = await request(app)
        .put(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent theme', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Updated Theme' };

      const response = await request(app)
        .put(`/api/v1/admin/themes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/themes/:id', () => {
    beforeEach(async () => {
      // Create a test theme
      const response = await request(app)
        .post('/api/v1/admin/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(generateUniqueThemeData());

      testThemeId = response.body.data.id;
    });

    it('should delete theme for admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Theme deleted successfully');

      // Verify theme is deleted
      const getResponse = await request(app)
        .get(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);

      testThemeId = ''; // Reset to avoid cleanup issues
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/themes/${testThemeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent theme', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/v1/admin/themes/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security and Integration Tests', () => {
    it('should maintain existing /api/v1/themes endpoints functionality', async () => {
      // Verify that the existing public themes API still works
      const response = await request(app)
        .get('/api/v1/themes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not interfere with forms API endpoints', async () => {
      // Verify that forms API is not affected
      const response = await request(app)
        .get('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent admin theme operations', async () => {
      const theme1Data = {
        ...generateUniqueThemeData(),
        name: `Concurrent Theme 1 ${Date.now()}`,
      };
      const theme2Data = {
        ...generateUniqueThemeData(),
        name: `Concurrent Theme 2 ${Date.now()}`,
      };

      // Create two themes concurrently
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/v1/admin/themes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(theme1Data),
        request(app)
          .post('/api/v1/admin/themes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(theme2Data),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.data.id).not.toBe(response2.body.data.id);

      // Clean up
      await themesRepository.delete(response1.body.data.id);
      await themesRepository.delete(response2.body.data.id);
    });
  });
});
