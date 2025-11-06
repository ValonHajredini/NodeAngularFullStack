/**
 * Comprehensive Users CRUD API Tests
 * Tests all CRUD operations with comprehensive scenarios:
 * - User creation, retrieval, update, deletion
 * - Pagination and search functionality
 * - Role-based access control
 * - Input validation and error responses
 * - Audit logging functionality
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, createManyTestUsers, getSeedUserTokens, authenticatedRequest } from '../helpers/auth-helper';
import { generateValidUserData, generateInvalidUserData, generatePaginationTestData, generateEdgeCaseData } from '../helpers/data-factory';
import { userProfileResponseSchema, userCreationResponseSchema, userUpdateResponseSchema, userDeletionResponseSchema, paginatedResponseSchema, errorResponseSchema, auditLogsResponseSchema, assertValidResponse } from '../helpers/validation-schemas';

describe('Comprehensive Users CRUD API', () => {
  let adminAuth: any;
  let userAuth: any;
  let readonlyAuth: any;

  beforeAll(async () => {
    const seedTokens = await getSeedUserTokens();
    adminAuth = seedTokens.admin;
    userAuth = seedTokens.user;
    readonlyAuth = seedTokens.readonly;
  });

  describe('GET /api/v1/users/profile - User Profile Retrieval', () => {
    it('should get authenticated user profile', async () => {
      const response = await authenticatedRequest(userAuth.token)
        .get('/api/v1/users/profile');

      expect(response.status).toBe(200);
      assertValidResponse(userProfileResponseSchema, response.body, 'user profile');
      expect(response.body.data.id).toBe(userAuth.user.id);
      expect(response.body.data.email).toBe(userAuth.user.email);
    });

    it('should reject unauthenticated profile requests', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile');

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'unauthenticated profile');
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'invalid token');
    });
  });

  describe('PATCH /api/v1/users/profile - User Profile Update', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast'
      };

      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      assertValidResponse(userUpdateResponseSchema, response.body, 'profile update');
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
      expect(response.body.data.email).toBe(testUser.user.email); // Email should remain unchanged
    });

    it('should reject profile update with invalid data', async () => {
      const invalidData = generateInvalidUserData();

      for (const invalidName of invalidData.invalidNames.slice(0, 3)) {
        const response = await authenticatedRequest(testUser.token)
          .patch('/api/v1/users/profile')
          .send({ firstName: invalidName });

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `invalid name update: ${invalidName}`);
      }
    });

    it('should prevent users from changing their role', async () => {
      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'role change attempt');
    });

    it('should handle unicode characters in profile updates', async () => {
      const edgeCaseData = generateEdgeCaseData();
      const unicodeName = edgeCaseData.unicodeStrings[0];

      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send({ firstName: unicodeName });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe(unicodeName);
    });
  });

  describe('GET /api/v1/users - User List (Admin Only)', () => {
    beforeEach(async () => {
      // Create test users for listing
      await createManyTestUsers(5, { admin: 1, user: 3, readonly: 1 });
    });

    it('should get paginated user list for admin', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users?page=1&limit=10');

      expect(response.status).toBe(200);
      assertValidResponse(paginatedResponseSchema, response.body, 'user list');
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should handle pagination parameters correctly', async () => {
      const paginationData = generatePaginationTestData();

      for (const params of paginationData.validPaginationParams) {
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?page=${params.page}&limit=${params.limit}`);

        expect(response.status).toBe(200);
        assertValidResponse(paginatedResponseSchema, response.body, `pagination ${params.page}/${params.limit}`);
        expect(response.body.data.pagination.page).toBe(params.page);
        expect(response.body.data.pagination.limit).toBe(params.limit);
      }
    });

    it('should reject invalid pagination parameters', async () => {
      const paginationData = generatePaginationTestData();

      for (const params of paginationData.invalidPaginationParams.slice(0, 3)) {
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?page=${params.page}&limit=${params.limit}`);

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `invalid pagination: ${JSON.stringify(params)}`);
      }
    });

    it('should filter users by search query', async () => {
      const testUser = await createTestUser({ firstName: 'SearchableUser' });

      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users?search=SearchableUser');

      expect(response.status).toBe(200);
      assertValidResponse(paginatedResponseSchema, response.body, 'search filter');

      const foundUser = response.body.data.users.find((u: any) => u.id === testUser.user.id);
      expect(foundUser).toBeDefined();
    });

    it('should filter users by role', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users?role=admin');

      expect(response.status).toBe(200);
      assertValidResponse(paginatedResponseSchema, response.body, 'role filter');

      response.body.data.users.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
    });

    it('should reject user list access for non-admin users', async () => {
      const response = await authenticatedRequest(userAuth.token)
        .get('/api/v1/users');

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'non-admin user list access');
    });

    it('should reject user list access for readonly users', async () => {
      const response = await authenticatedRequest(readonlyAuth.token)
        .get('/api/v1/users');

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'readonly user list access');
    });
  });

  describe('POST /api/v1/users - User Creation (Admin Only)', () => {
    it('should create new user with valid data', async () => {
      const userData = generateValidUserData();

      const response = await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      expect(response.status).toBe(201);
      assertValidResponse(userCreationResponseSchema, response.body, 'user creation');
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should create users with different roles', async () => {
      const roles = ['admin', 'user', 'readonly'] as const;

      for (const role of roles) {
        const userData = generateValidUserData({ role });

        const response = await authenticatedRequest(adminAuth.token)
          .post('/api/v1/users')
          .send(userData);

        expect(response.status).toBe(201);
        assertValidResponse(userCreationResponseSchema, response.body, `${role} creation`);
        expect(response.body.data.role).toBe(role);
      }
    });

    it('should reject user creation with invalid data', async () => {
      const invalidData = generateInvalidUserData();

      for (const invalidEmail of invalidData.invalidEmails.slice(0, 3)) {
        const userData = generateValidUserData({ email: invalidEmail });

        const response = await authenticatedRequest(adminAuth.token)
          .post('/api/v1/users')
          .send(userData);

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `invalid email creation: ${invalidEmail}`);
      }
    });

    it('should reject user creation for non-admin users', async () => {
      const userData = generateValidUserData();

      const response = await authenticatedRequest(userAuth.token)
        .post('/api/v1/users')
        .send(userData);

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'non-admin user creation');
    });

    it('should prevent duplicate email creation', async () => {
      const userData = generateValidUserData();

      // Create first user
      await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      // Try to create duplicate
      const response = await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      expect(response.status).toBe(409);
      assertValidResponse(errorResponseSchema, response.body, 'duplicate email creation');
    });
  });

  describe('GET /api/v1/users/:id - Individual User Retrieval', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should get user by ID for admin', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get(`/api/v1/users/${testUser.user.id}`);

      expect(response.status).toBe(200);
      assertValidResponse(userProfileResponseSchema, response.body, 'user by ID');
      expect(response.body.data.id).toBe(testUser.user.id);
    });

    it('should allow users to access their own data', async () => {
      const response = await authenticatedRequest(testUser.token)
        .get(`/api/v1/users/${testUser.user.id}`);

      expect(response.status).toBe(200);
      assertValidResponse(userProfileResponseSchema, response.body, 'own user access');
    });

    it('should prevent users from accessing other users data', async () => {
      const otherUser = await createTestUser();

      const response = await authenticatedRequest(testUser.token)
        .get(`/api/v1/users/${otherUser.user.id}`);

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'other user access');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await authenticatedRequest(adminAuth.token)
        .get(`/api/v1/users/${fakeId}`);

      expect(response.status).toBe(404);
      assertValidResponse(errorResponseSchema, response.body, 'non-existent user');
    });

    it('should reject invalid UUID format', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users/invalid-uuid');

      expect(response.status).toBe(400);
      assertValidResponse(errorResponseSchema, response.body, 'invalid UUID');
    });
  });

  describe('PATCH /api/v1/users/:id - User Update (Admin Only)', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should update user data as admin', async () => {
      const updateData = {
        firstName: 'AdminUpdated',
        lastName: 'User',
        role: 'admin'
      };

      const response = await authenticatedRequest(adminAuth.token)
        .patch(`/api/v1/users/${testUser.user.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      assertValidResponse(userUpdateResponseSchema, response.body, 'admin user update');
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.role).toBe(updateData.role);
    });

    it('should reject user update for non-admin users', async () => {
      const otherUser = await createTestUser();

      const response = await authenticatedRequest(testUser.token)
        .patch(`/api/v1/users/${otherUser.user.id}`)
        .send({ firstName: 'Hacker' });

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'non-admin user update');
    });

    it('should validate update data', async () => {
      const invalidData = generateInvalidUserData();

      const response = await authenticatedRequest(adminAuth.token)
        .patch(`/api/v1/users/${testUser.user.id}`)
        .send({ email: invalidData.invalidEmails[0] });

      expect(response.status).toBe(400);
      assertValidResponse(errorResponseSchema, response.body, 'invalid update data');
    });
  });

  describe('DELETE /api/v1/users/:id - User Deletion (Admin Only)', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should soft delete user as admin', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .delete(`/api/v1/users/${testUser.user.id}`);

      expect(response.status).toBe(200);
      assertValidResponse(userDeletionResponseSchema, response.body, 'user deletion');
      expect(response.body.data.deleted).toBe(true);

      // Verify user is soft deleted (cannot login)
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.user.email,
          password: 'Test123!@#'
        });

      expect(loginResponse.status).toBe(401);
    });

    it('should reject user deletion for non-admin users', async () => {
      const otherUser = await createTestUser();

      const response = await authenticatedRequest(testUser.token)
        .delete(`/api/v1/users/${otherUser.user.id}`);

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'non-admin user deletion');
    });

    it('should prevent self-deletion', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .delete(`/api/v1/users/${adminAuth.user.id}`);

      expect(response.status).toBe(400);
      assertValidResponse(errorResponseSchema, response.body, 'self-deletion');
    });
  });

  describe('Audit Logging Verification', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should log user creation in audit trail', async () => {
      const userData = generateValidUserData();

      await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      // Check audit logs
      const auditResponse = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/audit/logs?entityType=user&action=create');

      expect(auditResponse.status).toBe(200);
      assertValidResponse(auditLogsResponseSchema, auditResponse.body, 'audit logs');

      const createLog = auditResponse.body.data.logs.find((log: any) =>
        log.action === 'create' && log.entityType === 'user'
      );
      expect(createLog).toBeDefined();
    });

    it('should log user updates in audit trail', async () => {
      await authenticatedRequest(adminAuth.token)
        .patch(`/api/v1/users/${testUser.user.id}`)
        .send({ firstName: 'AuditTest' });

      const auditResponse = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/audit/logs?entityType=user&action=update');

      expect(auditResponse.status).toBe(200);

      const updateLog = auditResponse.body.data.logs.find((log: any) =>
        log.action === 'update' && log.entityId === testUser.user.id
      );
      expect(updateLog).toBeDefined();
    });

    it('should log user deletions in audit trail', async () => {
      await authenticatedRequest(adminAuth.token)
        .delete(`/api/v1/users/${testUser.user.id}`);

      const auditResponse = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/audit/logs?entityType=user&action=delete');

      expect(auditResponse.status).toBe(200);

      const deleteLog = auditResponse.body.data.logs.find((log: any) =>
        log.action === 'delete' && log.entityId === testUser.user.id
      );
      expect(deleteLog).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle user listing within performance requirements', async () => {
      await createManyTestUsers(50);

      const startTime = Date.now();
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users?page=1&limit=20');

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should be fast for pagination
    });

    it('should handle concurrent user operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) =>
        authenticatedRequest(adminAuth.token)
          .post('/api/v1/users')
          .send(generateValidUserData({ email: `concurrent-${i}@example.com` }))
      );

      const responses = await Promise.all(operations);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        assertValidResponse(userCreationResponseSchema, response.body, `concurrent operation ${index}`);
      });
    });
  });
});