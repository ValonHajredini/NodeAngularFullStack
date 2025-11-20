import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';

/**
 * Integration tests for Theme API Authorization (Story 23.2).
 * Tests non-admin theme creation and owner-or-admin edit/delete authorization.
 */
describe('Theme API Authorization', () => {
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;
  let userAId: string;
  let userAThemeId: string;

  const validThemeData = {
    name: `User A Custom Theme ${Date.now()}`,
    description: 'A custom theme created by user A',
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
    },
  };

  beforeAll(async () => {
    const pool = databaseService.getPool();

    // Clean database
    await pool.query('DELETE FROM form_themes WHERE is_custom = TRUE');
    await pool.query("DELETE FROM users WHERE email LIKE '%test-themes-auth%'");

    // Create test user A
    const userARegisterResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user-a-test-themes-auth@example.com',
        password: 'UserA123!@#',
        firstName: 'UserA',
        lastName: 'Test',
      });

    userAId = userARegisterResponse.body.data.user.id;

    // Get user A token
    const userALoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user-a-test-themes-auth@example.com',
        password: 'UserA123!@#',
      });

    userAToken = userALoginResponse.body.data.accessToken;

    // Create test user B
    await request(app).post('/api/v1/auth/register').send({
      email: 'user-b-test-themes-auth@example.com',
      password: 'UserB123!@#',
      firstName: 'UserB',
      lastName: 'Test',
    });

    // Get user B token
    const userBLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user-b-test-themes-auth@example.com',
        password: 'UserB123!@#',
      });

    userBToken = userBLoginResponse.body.data.accessToken;

    // Create test admin user
    const adminRegisterResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin-test-themes-auth@example.com',
        password: 'User123!@#',
        firstName: 'Admin',
        lastName: 'Test',
      });

    // Upgrade test user to admin role
    const adminUserId = adminRegisterResponse.body.data.user.id;
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [
      adminUserId,
    ]);

    // Get admin token
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin-test-themes-auth@example.com',
        password: 'User123!@#',
      });

    adminToken = adminLoginResponse.body.data.accessToken;

    // Create theme for user A (needed for PUT/DELETE tests)
    const themeResponse = await request(app)
      .post('/api/v1/themes')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(validThemeData);

    userAThemeId = themeResponse.body.data.id;
  });

  afterAll(async () => {
    const pool = databaseService.getPool();

    // Cleanup
    await pool.query('DELETE FROM form_themes WHERE is_custom = TRUE');
    await pool.query("DELETE FROM users WHERE email LIKE '%test-themes-auth%'");

    // Close database connections
    await databaseService.close();
  });

  describe('POST /api/v1/themes', () => {
    it('should allow non-admin user to create theme', async () => {
      const secondThemeData = {
        ...validThemeData,
        name: `Second Theme by User A ${Date.now()}`,
      };

      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(secondThemeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(secondThemeData.name);
      expect(response.body.data.description).toBe(validThemeData.description);
      expect(response.body.message).toBe('Theme created successfully');

      // Verify theme.createdBy matches user ID
      const pool = databaseService.getPool();
      const themeQuery = await pool.query(
        'SELECT created_by FROM form_themes WHERE id = $1',
        [response.body.data.id]
      );
      expect(themeQuery.rows[0].created_by).toBe(userAId);

      // Clean up this test's theme
      await pool.query('DELETE FROM form_themes WHERE id = $1', [
        response.body.data.id,
      ]);
    });

    it('should reject theme creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/themes')
        .send(validThemeData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should allow admin to create theme', async () => {
      const adminThemeData = {
        ...validThemeData,
        name: `Admin Custom Theme ${Date.now()}`,
        description: 'A custom theme created by admin',
      };

      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(adminThemeData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(adminThemeData.name);

      // Clean up admin theme
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM form_themes WHERE id = $1', [
        response.body.data.id,
      ]);
    });
  });

  describe('PUT /api/v1/themes/:id', () => {
    it('should allow user to edit their own theme', async () => {
      const updateData = {
        name: `Updated Theme Name by User A ${Date.now()}`,
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/v1/themes/${userAThemeId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.message).toBe('Theme updated successfully');
    });

    it("should reject user editing another user's theme", async () => {
      const updateData = {
        name: 'Hacked Theme Name',
      };

      const response = await request(app)
        .put(`/api/v1/themes/${userAThemeId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('own themes');
    });

    it("should allow admin to edit any user's theme", async () => {
      const updateData = {
        name: `Admin Updated Theme ${Date.now()}`,
        description: 'Updated by admin',
      };

      const response = await request(app)
        .put(`/api/v1/themes/${userAThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/v1/themes/:id', () => {
    let userAOwnThemeId: string;

    beforeAll(async () => {
      // Create a separate theme for user A to delete
      const themeData = {
        ...validThemeData,
        name: `User A Theme for Deletion ${Date.now()}`,
      };

      const response = await request(app)
        .post('/api/v1/themes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(themeData);

      userAOwnThemeId = response.body.data.id;
    });

    it('should allow user to delete their own theme', async () => {
      const response = await request(app)
        .delete(`/api/v1/themes/${userAOwnThemeId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Theme deleted successfully');
    });

    it("should reject user deleting another user's theme", async () => {
      const response = await request(app)
        .delete(`/api/v1/themes/${userAThemeId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('own themes');
    });

    it('should allow admin to delete any theme', async () => {
      const response = await request(app)
        .delete(`/api/v1/themes/${userAThemeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Theme deleted successfully');
    });
  });
});
