import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import { FormStatus } from '@nodeangularfullstack/shared';

/**
 * Integration tests for Forms API Theme Integration (Story 20.4).
 * Tests theme integration functionality including:
 * - Creating forms with themeId
 * - Updating forms with themeId
 * - Public form rendering with theme data
 * - Theme validation and error handling
 */
describe('Forms API Theme Integration', () => {
  let userToken: string;
  // let adminToken: string; // Unused for now
  let userId: string;
  let adminId: string;
  let testThemeId: string;
  let formId: string;
  // let schemaId: string; // Unused for now

  const validThemeData = {
    name: 'Test Theme for Forms',
    description: 'A test theme for forms integration testing',
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
    // Register test users
    const userRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'formthemeuser@example.com',
        password: 'TestPass123!',
        firstName: 'Form',
        lastName: 'ThemeUser',
      });

    userId = userRegistrationResponse.body.data.user.id;

    const adminRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'formthemeadmin@example.com',
        password: 'AdminPass123!',
        firstName: 'Form',
        lastName: 'ThemeAdmin',
      });

    adminId = adminRegistrationResponse.body.data.user.id;

    // Manually update admin role in database
    const adminClient = await databaseService.getPool().connect();
    try {
      await adminClient.query('UPDATE users SET role = $1 WHERE id = $2', [
        'admin',
        adminId,
      ]);
    } finally {
      adminClient.release();
    }

    // Login to get valid JWT tokens
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'formthemeuser@example.com',
        password: 'TestPass123!',
      });

    userToken = userLoginResponse.body.data.accessToken;

    // Debug: Check if token was extracted correctly
    if (!userToken) {
      console.error('User login failed:', userLoginResponse.body);
      throw new Error('Failed to get user token');
    }

    // const adminLoginResponse = await request(app)
    //   .post('/api/v1/auth/login')
    //   .send({
    //     email: 'formthemeadmin@example.com',
    //     password: 'AdminPass123!',
    //   });

    // adminToken = adminLoginResponse.body.data.token; // Unused for now

    // Create a test theme directly in the database
    const client = await databaseService.getPool().connect();
    try {
      const themeResult = await client.query(
        `INSERT INTO form_themes (
          name, description, thumbnail_url, theme_config, usage_count, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          validThemeData.name,
          validThemeData.description,
          validThemeData.thumbnailUrl,
          JSON.stringify(validThemeData.themeConfig),
          0,
          true,
          adminId, // Use the admin user we created
        ]
      );
      testThemeId = themeResult.rows[0].id;
    } finally {
      client.release();
    }
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

      // Delete test users
      await client.query('DELETE FROM users WHERE id = ANY($1)', [
        [userId, adminId],
      ]);
    } finally {
      client.release();
    }
  });

  describe('POST /api/v1/forms - Create Form with Theme', () => {
    it('should create a form with themeId successfully', async () => {
      const formData = {
        title: 'Test Form with Theme',
        description: 'A test form with theme integration',
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

    it('should create a form without themeId successfully', async () => {
      const formData = {
        title: 'Test Form without Theme',
        description: 'A test form without theme',
        status: FormStatus.DRAFT,
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
      expect(response.body.data.themeId).toBeNull();
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

    it('should reject form creation with non-existent themeId', async () => {
      const formData = {
        title: 'Test Form with Non-existent Theme',
        description: 'A test form with non-existent theme',
        status: FormStatus.DRAFT,
        themeId: '123e4567-e89b-12d3-a456-426614174000',
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
      expect(response.body.message).toContain('Theme not found or inactive');
    });
  });

  describe('PUT /api/v1/forms/:id - Update Form with Theme', () => {
    it('should update a form with themeId successfully', async () => {
      const updateData = {
        title: 'Updated Form with Theme',
        description: 'An updated form with theme integration',
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

    it('should update a form to remove themeId successfully', async () => {
      const updateData = {
        title: 'Updated Form without Theme',
        description: 'An updated form without theme',
        themeId: null,
      };

      const response = await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.themeId).toBeNull();
    });

    it('should reject form update with invalid themeId', async () => {
      const updateData = {
        title: 'Updated Form with Invalid Theme',
        themeId: 'invalid-uuid',
      };

      const response = await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Theme ID must be a valid UUID');
    });
  });

  describe('GET /api/v1/forms/:id - Get Form with Theme', () => {
    it('should return form with embedded theme data when themeId exists', async () => {
      // First, update the form to have a theme
      await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ themeId: testThemeId });

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

    it('should return form without theme data when themeId is null', async () => {
      // First, update the form to remove theme
      await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ themeId: null });

      const response = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.themeId).toBeNull();

      // Check if schema has no theme data
      if (response.body.data.schema) {
        expect(response.body.data.schema.themeId).toBeNull();
        expect(response.body.data.schema.theme).toBeNull();
      }
    });
  });

  describe('POST /api/v1/forms/:id/publish - Publish Form with Theme', () => {
    it('should publish a form with theme and return render URL', async () => {
      // First, update the form to have a theme
      await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ themeId: testThemeId });

      const response = await request(app)
        .post(`/api/v1/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ expiresInDays: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('form');
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data).toHaveProperty('renderUrl');
      expect(response.body.data.form.themeId).toBe(testThemeId);
      expect(response.body.data.schema.themeId).toBe(testThemeId);
      expect(response.body.data.schema.theme).toBeDefined();
      expect(response.body.data.schema.theme.id).toBe(testThemeId);

      // schemaId = response.body.data.schema.id; // Unused for now
    });
  });

  describe('GET /api/v1/public/forms/render/:token - Public Form Rendering with Theme', () => {
    it('should render public form with theme data', async () => {
      // First, publish the form with theme
      const publishResponse = await request(app)
        .post(`/api/v1/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ expiresInDays: 30 });

      const renderToken = publishResponse.body.data.renderUrl.split('/').pop();

      const response = await request(app).get(
        `/api/v1/public/forms/render/${renderToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data).toHaveProperty('settings');
      expect(response.body.data).toHaveProperty('theme');
      expect(response.body.data.schema.themeId).toBe(testThemeId);
      expect(response.body.data.theme).toBeDefined();
      expect(response.body.data.theme.id).toBe(testThemeId);
      expect(response.body.data.theme.name).toBe(validThemeData.name);
      expect(response.body.data.theme.description).toBe(
        validThemeData.description
      );
      expect(response.body.data.theme.themeConfig).toEqual(
        validThemeData.themeConfig
      );
    });

    it('should render public form without theme data when themeId is null', async () => {
      // First, update the form to remove theme and republish
      await request(app)
        .put(`/api/v1/forms/${formId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ themeId: null });

      const publishResponse = await request(app)
        .post(`/api/v1/forms/${formId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ expiresInDays: 30 });

      const renderToken = publishResponse.body.data.renderUrl.split('/').pop();

      const response = await request(app).get(
        `/api/v1/public/forms/render/${renderToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('schema');
      expect(response.body.data).toHaveProperty('settings');
      expect(response.body.data).toHaveProperty('theme');
      expect(response.body.data.schema.themeId).toBeNull();
      expect(response.body.data.theme).toBeNull();
    });
  });

  describe('Theme Validation Edge Cases', () => {
    it('should handle inactive theme gracefully', async () => {
      // Get existing admin token
      const inactiveThemeAdminLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!@#',
        });

      const inactiveThemeAdminToken =
        inactiveThemeAdminLoginResponse.body.data.token;

      // Create an inactive theme
      const inactiveThemeResponse = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${inactiveThemeAdminToken}`)
        .send({
          ...validThemeData,
          name: 'Inactive Test Theme',
        });

      const inactiveThemeId = inactiveThemeResponse.body.data.id;

      // Deactivate the theme
      await request(app)
        .put(`/api/v1/themes/${inactiveThemeId}`)
        .set('Authorization', `Bearer ${inactiveThemeAdminToken}`)
        .send({ isActive: false });

      // Try to create a form with inactive theme
      const formData = {
        title: 'Test Form with Inactive Theme',
        description: 'A test form with inactive theme',
        status: FormStatus.DRAFT,
        themeId: inactiveThemeId,
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
      expect(response.body.message).toContain('Theme is not active');

      // Clean up inactive theme using existing admin
      const cleanupAdminLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!@#',
        });

      const cleanupAdminToken = cleanupAdminLoginResponse.body.data.token;

      await request(app)
        .delete(`/api/v1/themes/${inactiveThemeId}`)
        .set('Authorization', `Bearer ${cleanupAdminToken}`);
    });

    it('should handle themeId in schema.themeId path', async () => {
      const formData = {
        title: 'Test Form with Schema Theme',
        description: 'A test form with theme in schema',
        status: FormStatus.DRAFT,
        schema: {
          themeId: testThemeId,
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
      expect(response.body.data.themeId).toBe(testThemeId);
    });
  });
});
