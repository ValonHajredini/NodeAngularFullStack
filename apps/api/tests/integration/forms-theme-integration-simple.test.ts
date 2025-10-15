import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import { FormStatus } from '@nodeangularfullstack/shared';

/**
 * Simple integration tests for Forms API Theme Integration (Story 20.4).
 * Tests basic theme integration functionality.
 */
describe('Forms API Theme Integration - Simple', () => {
  let userToken: string;
  let testThemeId: string;
  let formId: string;

  const validThemeData = {
    name: 'Simple Test Theme',
    description: 'A simple test theme for forms integration testing',
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
    // Use existing seeded users instead of creating new ones

    // Use existing admin user to create theme
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!@#',
      });

    if (adminLoginResponse.status !== 200) {
      console.error('Admin login failed:', adminLoginResponse.body);
      throw new Error('Failed to login as admin');
    }

    const adminToken = adminLoginResponse.body.data.accessToken;

    // Create a test theme
    const themeResponse = await request(app)
      .post('/api/v1/themes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validThemeData);

    if (themeResponse.status !== 201) {
      console.error('Theme creation failed:', themeResponse.body);
      throw new Error('Failed to create test theme');
    }

    testThemeId = themeResponse.body.data.id;

    // Register and login as test user
    const userRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'simpleformuser@example.com',
        password: 'TestPass123!',
        firstName: 'Simple',
        lastName: 'FormUser',
      });

    if (userRegistrationResponse.status !== 201) {
      console.error('User registration failed:', userRegistrationResponse.body);
      throw new Error('Failed to register test user');
    }

    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'simpleformuser@example.com',
        password: 'TestPass123!',
      });

    if (userLoginResponse.status !== 200) {
      console.error('User login failed:', userLoginResponse.body);
      throw new Error('Failed to login as test user');
    }

    userToken = userLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    const client = await databaseService.getPool().connect();
    try {
      // Delete test form and related data
      if (formId) {
        await client.query('DELETE FROM form_submissions WHERE form_id = $1', [
          formId,
        ]);
        await client.query('DELETE FROM form_schemas WHERE form_id = $1', [
          formId,
        ]);
        await client.query('DELETE FROM forms WHERE id = $1', [formId]);
      }

      // Delete test theme
      if (testThemeId) {
        await client.query('DELETE FROM form_themes WHERE id = $1', [
          testThemeId,
        ]);
      }

      // Delete test user
      await client.query(
        "DELETE FROM users WHERE email = 'simpleformuser@example.com'"
      );
    } finally {
      client.release();
    }
  });

  describe('Basic Theme Integration', () => {
    it('should create a form with themeId successfully', async () => {
      const formData = {
        title: 'Simple Test Form with Theme',
        description: 'A simple test form with theme integration',
        status: FormStatus.DRAFT,
        themeId: testThemeId,
        schema: {
          fields: [
            {
              id: 'field1',
              type: 'text',
              label: 'Name',
              required: true,
              placeholder: 'Enter your name',
            },
          ],
        },
      };

      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(formData.title);
      expect(response.body.data.themeId).toBe(testThemeId);

      formId = response.body.data.id;
    });

    it('should get form with embedded theme data', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.themeId).toBe(testThemeId);

      // Check if schema has embedded theme data
      if (response.body.data.schema) {
        expect(response.body.data.schema.themeId).toBe(testThemeId);
        expect(response.body.data.schema.theme).toBeDefined();
        expect(response.body.data.schema.theme.id).toBe(testThemeId);
        expect(response.body.data.schema.theme.name).toBe(validThemeData.name);
        expect(response.body.data.schema.theme.description).toBe(
          validThemeData.description
        );
        expect(response.body.data.schema.theme.themeConfig).toEqual(
          validThemeData.themeConfig
        );
      }
    });

    it('should update form themeId successfully', async () => {
      const updateData = {
        title: 'Updated Simple Form with Theme',
        description: 'An updated simple form with theme integration',
        themeId: testThemeId,
      };

      const response = await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.themeId).toBe(testThemeId);
    });

    it('should reject form creation with invalid themeId', async () => {
      const formData = {
        title: 'Test Form with Invalid Theme',
        description: 'A test form with invalid theme',
        status: FormStatus.DRAFT,
        themeId: 'invalid-uuid',
        schema: {
          fields: [
            {
              id: 'field1',
              type: 'text',
              label: 'Name',
              required: true,
              placeholder: 'Enter your name',
            },
          ],
        },
      };

      const response = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${userToken}`)
        .send(formData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Theme ID must be a valid UUID');
    });
  });
});
