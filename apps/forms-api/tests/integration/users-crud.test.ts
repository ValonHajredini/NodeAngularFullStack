import request from 'supertest';
import { app } from '../../src/server';
import { usersRepository } from '../../src/repositories/users.repository';
import { auditService } from '../../src/services/audit.service';
import { databaseService } from '../../src/services/database.service';

/**
 * Integration tests for Users CRUD API endpoints.
 * Tests all CRUD operations with proper authentication, validation, and error handling.
 */
describe('Users CRUD API', () => {
  let adminToken: string;
  let userToken: string;
  let testUserId: string;
  let secondUserId: string;

  beforeAll(async () => {
    // Get authentication tokens for testing
    // Admin token
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'AdminPass123!'
      });

    adminToken = adminLoginResponse.body.data.token;

    // User token
    const userLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'UserPass123!'
      });

    userToken = userLoginResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await usersRepository.softDelete(testUserId);
    }
    if (secondUserId) {
      await usersRepository.softDelete(secondUserId);
    }

    // Close database connections
    await databaseService.close();
  });

  describe('POST /api/v1/users', () => {
    it('should create user with valid data (admin only)', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.firstName).toBe(userData.firstName);
      expect(response.body.data.lastName).toBe(userData.lastName);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data.passwordHash).toBeUndefined(); // Password should not be returned

      testUserId = response.body.data.id;
    });

    it('should reject duplicate email addresses', async () => {
      const userData = {
        email: 'admin@example.com', // Existing email
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toBe('Email already exists');
    });

    it('should validate password strength requirements', async () => {
      const userData = {
        email: 'weakpass@example.com',
        password: 'weak', // Weak password
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid role values', async () => {
      const userData = {
        email: 'invalidrole@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require admin access', async () => {
      const userData = {
        email: 'unauthorized@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent XSS attacks in input fields', async () => {
      const userData = {
        email: 'xss@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SECURITY_ERROR');
    });
  });

  describe('GET /api/v1/users', () => {
    beforeAll(async () => {
      // Create a second test user for pagination testing
      const userData = {
        email: 'pagination@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      secondUserId = response.body.data.id;
    });

    it('should return paginated users list (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('pages');
      expect(response.body.data.pagination).toHaveProperty('hasNext');
      expect(response.body.data.pagination).toHaveProperty('hasPrev');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=newuser')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);

      // Check if search result contains the expected user
      const foundUser = response.body.data.users.find((user: any) =>
        user.email.includes('newuser') ||
        user.firstName.toLowerCase().includes('newuser') ||
        user.lastName.toLowerCase().includes('newuser')
      );
      expect(foundUser).toBeDefined();
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/v1/users?role=user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned users should have role 'user'
      response.body.data.users.forEach((user: any) => {
        expect(user.role).toBe('user');
      });
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/api/v1/users?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned users should be active
      response.body.data.users.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should respect pagination limits', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should enforce maximum pagination limit', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=150') // Above max limit
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should require admin access', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by ID (admin access)', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should allow users to access their own profile', async () => {
      // First get the user ID for the user token
      const userResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      const userId = userResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
    });

    it('should reject access to other users profiles by regular users', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent users', async () => {
      const response = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user with valid data (admin only)', async () => {
      const updateData = {
        email: 'updated@example.com',
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
      expect(response.body.data.role).toBe(updateData.role);
      expect(response.body.data.isActive).toBe(updateData.isActive);
      expect(response.body.data.emailVerified).toBe(updateData.emailVerified);
    });

    it('should reject duplicate email on update', async () => {
      const updateData = {
        email: 'admin@example.com', // Existing email
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        role: 'user'
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should require admin access', async () => {
      const updateData = {
        email: 'unauthorized@example.com',
        firstName: 'Unauthorized',
        lastName: 'Update',
        role: 'user'
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should validate required fields for PUT', async () => {
      const incompleteData = {
        email: 'incomplete@example.com'
        // Missing required fields for PUT
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should partially update user (admin - all fields)', async () => {
      const updateData = {
        firstName: 'PatchedFirst'
      };

      const response = await request(app)
        .patch(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });

    it('should allow users to update their own basic profile', async () => {
      // Get user's own ID
      const userResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      const userId = userResponse.body.data.id;

      const updateData = {
        firstName: 'SelfUpdated'
      };

      const response = await request(app)
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });

    it('should prevent regular users from updating role', async () => {
      // Get user's own ID
      const userResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      const userId = userResponse.body.data.id;

      const updateData = {
        role: 'admin' // Regular users shouldn't be able to change their role
      };

      const response = await request(app)
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // The role should not be updated for regular users
      expect(response.status).toBe(200);
      expect(response.body.data.role).not.toBe('admin');
    });

    it('should require at least one field for update', async () => {
      const response = await request(app)
        .patch(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should soft delete user (admin only)', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify user is soft deleted
      const getResponse = await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should require admin access', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${secondUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent users', async () => {
      const response = await request(app)
        .delete('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Audit Logging', () => {
    it('should log user creation events', async () => {
      const userData = {
        email: 'audit-test@example.com',
        password: 'SecurePass123!',
        firstName: 'Audit',
        lastName: 'Test',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);

      // Check audit log
      const auditLogs = await auditService.getResourceLogs('users', response.body.data.id);
      expect(auditLogs.length).toBeGreaterThan(0);

      const createLog = auditLogs.find(log => log.action === 'CREATE');
      expect(createLog).toBeDefined();
      expect(createLog.resourceType).toBe('users');
      expect(createLog.resourceId).toBe(response.body.data.id);

      // Clean up
      await usersRepository.softDelete(response.body.data.id);
    });

    it('should log user update events', async () => {
      // Create a user for testing
      const userData = {
        email: 'audit-update@example.com',
        password: 'SecurePass123!',
        firstName: 'AuditUpdate',
        lastName: 'Test',
        role: 'user'
      };

      const createResponse = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      const userId = createResponse.body.data.id;

      // Update the user
      const updateData = {
        firstName: 'UpdatedAudit'
      };

      const updateResponse = await request(app)
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);

      // Check audit log
      const auditLogs = await auditService.getResourceLogs('users', userId);
      const updateLog = auditLogs.find(log => log.action === 'UPDATE');
      expect(updateLog).toBeDefined();
      expect(updateLog.changes).toEqual(updateData);

      // Clean up
      await usersRepository.softDelete(userId);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in search parameters', async () => {
      const maliciousSearch = "'; DROP TABLE users; --";

      const response = await request(app)
        .get(`/api/v1/users?search=${encodeURIComponent(maliciousSearch)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not crash and return normal response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent SQL injection in user data', async () => {
      const maliciousData = {
        email: 'inject@example.com',
        password: 'SecurePass123!',
        firstName: "'; DROP TABLE users; --",
        lastName: 'Test',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousData);

      // Should be rejected by validation
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large pagination requests efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/users?page=1&limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle empty search results gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=nonexistentuser123456')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });
});