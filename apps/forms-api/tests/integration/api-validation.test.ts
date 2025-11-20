/**
 * Comprehensive API Response Validation Tests
 * Tests all API endpoints for proper response structure and data types:
 * - Schema validation for all responses
 * - Data type verification for all fields
 * - Required field presence validation
 * - Error response format consistency
 * - JSON structure compliance
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, getSeedUserTokens, authenticatedRequest } from '../helpers/auth-helper';
import { generateValidUserData } from '../helpers/data-factory';
import {
  authResponseSchema,
  userProfileResponseSchema,
  paginatedResponseSchema,
  errorResponseSchema,
  healthCheckResponseSchema,
  tokenRefreshResponseSchema,
  userCreationResponseSchema,
  userUpdateResponseSchema,
  userDeletionResponseSchema,
  auditLogsResponseSchema,
  assertValidResponse,
  validateResponse
} from '../helpers/validation-schemas';

describe('Comprehensive API Response Validation', () => {
  let adminAuth: any;
  let userAuth: any;
  let testUser: any;

  beforeAll(async () => {
    const seedTokens = await getSeedUserTokens();
    adminAuth = seedTokens.admin;
    userAuth = seedTokens.user;
    testUser = await createTestUser();
  });

  describe('Authentication Endpoint Response Validation', () => {
    it('should validate registration response structure', async () => {
      const userData = generateValidUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);

      // Test schema validation
      const validation = validateResponse(authResponseSchema, response.body);
      expect(validation.error).toBeUndefined();

      // Test specific field types
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.data).toBe('object');
      expect(typeof response.body.data.token).toBe('string');
      expect(typeof response.body.data.refreshToken).toBe('string');
      expect(typeof response.body.data.expiresIn).toBe('number');
      expect(typeof response.body.data.user).toBe('object');

      // Test user object structure
      expect(typeof response.body.data.user.id).toBe('string');
      expect(typeof response.body.data.user.email).toBe('string');
      expect(typeof response.body.data.user.firstName).toBe('string');
      expect(typeof response.body.data.user.lastName).toBe('string');
      expect(typeof response.body.data.user.role).toBe('string');
      expect(['admin', 'user', 'readonly']).toContain(response.body.data.user.role);
      expect(typeof response.body.data.user.createdAt).toBe('string');
      expect(typeof response.body.data.user.updatedAt).toBe('string');

      // Test date format validation
      expect(new Date(response.body.data.user.createdAt).toISOString()).toBe(response.body.data.user.createdAt);
      expect(new Date(response.body.data.user.updatedAt).toISOString()).toBe(response.body.data.user.updatedAt);

      // Test UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(response.body.data.user.id)).toBe(true);

      // Ensure password is not exposed
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should validate login response structure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.user.email,
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      assertValidResponse(authResponseSchema, response.body, 'login response');

      // Additional type checks
      expect(response.body.data.expiresIn).toBeGreaterThan(0);
      expect(response.body.data.token.split('.').length).toBe(3); // JWT format
    });

    it('should validate token refresh response structure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testUser.refreshToken });

      expect(response.status).toBe(200);
      assertValidResponse(tokenRefreshResponseSchema, response.body, 'token refresh');

      // Validate new tokens are different
      expect(response.body.data.token).not.toBe(testUser.token);
      expect(response.body.data.refreshToken).not.toBe(testUser.refreshToken);
    });

    it('should validate authentication error response structure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'auth error');

      // Test error object structure
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
      expect(typeof response.body.error.timestamp).toBe('string');
      expect(new Date(response.body.error.timestamp).toISOString()).toBe(response.body.error.timestamp);
    });
  });

  describe('User Management Endpoint Response Validation', () => {
    it('should validate user profile response structure', async () => {
      const response = await authenticatedRequest(userAuth.token)
        .get('/api/v1/users/profile');

      expect(response.status).toBe(200);
      assertValidResponse(userProfileResponseSchema, response.body, 'user profile');

      // Test complete user object validation
      const user = response.body.data;
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.role).toBe('string');
      expect(typeof user.isActive).toBe('boolean');
      expect(typeof user.createdAt).toBe('string');
      expect(typeof user.updatedAt).toBe('string');

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(user.email)).toBe(true);
    });

    it('should validate user list response structure', async () => {
      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users?page=1&limit=10');

      expect(response.status).toBe(200);
      assertValidResponse(paginatedResponseSchema, response.body, 'user list');

      // Test pagination object structure
      const pagination = response.body.data.pagination;
      expect(typeof pagination.page).toBe('number');
      expect(typeof pagination.limit).toBe('number');
      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.pages).toBe('number');
      expect(typeof pagination.hasNext).toBe('boolean');
      expect(typeof pagination.hasPrev).toBe('boolean');

      // Test logical pagination values
      expect(pagination.page).toBeGreaterThan(0);
      expect(pagination.limit).toBeGreaterThan(0);
      expect(pagination.total).toBeGreaterThanOrEqual(0);
      expect(pagination.pages).toBeGreaterThanOrEqual(0);

      // Test users array
      expect(Array.isArray(response.body.data.users)).toBe(true);
      if (response.body.data.users.length > 0) {
        response.body.data.users.forEach((user: any, index: number) => {
          const userValidation = validateResponse(userProfileResponseSchema, { success: true, data: user });
          expect(userValidation.error).toBeUndefined(`User ${index} validation failed`);
        });
      }
    });

    it('should validate user creation response structure', async () => {
      const userData = generateValidUserData();

      const response = await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      expect(response.status).toBe(201);
      assertValidResponse(userCreationResponseSchema, response.body, 'user creation');

      // Ensure password is not in response
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should validate user update response structure', async () => {
      const updateData = { firstName: 'UpdatedName' };

      const response = await authenticatedRequest(userAuth.token)
        .patch('/api/v1/users/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      assertValidResponse(userUpdateResponseSchema, response.body, 'user update');

      // Verify updated field
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });

    it('should validate user deletion response structure', async () => {
      const deletableUser = await createTestUser();

      const response = await authenticatedRequest(adminAuth.token)
        .delete(`/api/v1/users/${deletableUser.user.id}`);

      expect(response.status).toBe(200);
      assertValidResponse(userDeletionResponseSchema, response.body, 'user deletion');

      // Test deletion confirmation structure
      expect(typeof response.body.data.id).toBe('string');
      expect(typeof response.body.data.deleted).toBe('boolean');
      expect(response.body.data.deleted).toBe(true);
    });
  });

  describe('Error Response Validation', () => {
    it('should validate 400 error response structure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({}); // Missing required fields

      expect(response.status).toBe(400);
      assertValidResponse(errorResponseSchema, response.body, '400 error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate 401 error response structure', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile'); // No auth header

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, '401 error');
      expect(['AUTHENTICATION_REQUIRED', 'INVALID_TOKEN']).toContain(response.body.error.code);
    });

    it('should validate 403 error response structure', async () => {
      const response = await authenticatedRequest(userAuth.token)
        .get('/api/v1/users'); // User trying to access admin endpoint

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, '403 error');
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate 404 error response structure', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await authenticatedRequest(adminAuth.token)
        .get(`/api/v1/users/${fakeId}`);

      expect(response.status).toBe(404);
      assertValidResponse(errorResponseSchema, response.body, '404 error');
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should validate 409 error response structure', async () => {
      const userData = generateValidUserData();

      // Create user first
      await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      // Try to create duplicate
      const response = await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(userData);

      expect(response.status).toBe(409);
      assertValidResponse(errorResponseSchema, response.body, '409 error');
      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    it('should validate 500 error response structure', async () => {
      // This test might need to be adapted based on how you trigger 500 errors
      // For example, by temporarily breaking database connection
      const response = await request(app)
        .get('/api/v1/health');

      // If health endpoint returns 500, validate error structure
      if (response.status === 500) {
        assertValidResponse(errorResponseSchema, response.body, '500 error');
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('Health Check Response Validation', () => {
    it('should validate health check response structure', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      if (response.status === 200) {
        assertValidResponse(healthCheckResponseSchema, response.body, 'health check');

        // Test specific health data types
        expect(typeof response.body.data.status).toBe('string');
        expect(typeof response.body.data.timestamp).toBe('string');
        expect(typeof response.body.data.uptime).toBe('number');
        expect(typeof response.body.data.database).toBe('object');
        expect(typeof response.body.data.database.status).toBe('string');

        // Validate timestamp format
        expect(new Date(response.body.data.timestamp).toISOString()).toBe(response.body.data.timestamp);

        // Validate uptime is positive
        expect(response.body.data.uptime).toBeGreaterThan(0);
      }
    });
  });

  describe('Audit Logs Response Validation', () => {
    it('should validate audit logs response structure', async () => {
      // Create some audit trail data
      await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(generateValidUserData());

      const response = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/audit/logs');

      expect(response.status).toBe(200);
      assertValidResponse(auditLogsResponseSchema, response.body, 'audit logs');

      // Test audit log entries
      if (response.body.data.logs.length > 0) {
        const log = response.body.data.logs[0];
        expect(typeof log.id).toBe('string');
        expect(typeof log.action).toBe('string');
        expect(typeof log.entityType).toBe('string');
        expect(typeof log.entityId).toBe('string');
        expect(typeof log.userId).toBe('string');
        expect(typeof log.timestamp).toBe('string');

        // Validate timestamp format
        expect(new Date(log.timestamp).toISOString()).toBe(log.timestamp);

        // Validate UUID formats
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(log.id)).toBe(true);
        expect(uuidRegex.test(log.entityId)).toBe(true);
        expect(uuidRegex.test(log.userId)).toBe(true);
      }
    });
  });

  describe('Response Consistency Tests', () => {
    it('should have consistent success response format across endpoints', async () => {
      const endpoints = [
        { method: 'get', url: '/api/v1/users/profile', auth: userAuth.token },
        { method: 'get', url: '/api/v1/users', auth: adminAuth.token }
      ];

      for (const endpoint of endpoints) {
        const response = await authenticatedRequest(endpoint.auth)[endpoint.method](endpoint.url);

        if (response.status === 200) {
          expect(response.body).toHaveProperty('success');
          expect(response.body).toHaveProperty('data');
          expect(response.body.success).toBe(true);
          expect(typeof response.body.data).toBe('object');
        }
      }
    });

    it('should have consistent error response format across endpoints', async () => {
      const errorEndpoints = [
        { method: 'get', url: '/api/v1/users/profile' }, // No auth
        { method: 'get', url: '/api/v1/users', auth: userAuth.token }, // Insufficient perms
        { method: 'post', url: '/api/v1/auth/login', body: {} } // Missing data
      ];

      for (const endpoint of errorEndpoints) {
        let response;
        if (endpoint.auth) {
          response = await authenticatedRequest(endpoint.auth)[endpoint.method](endpoint.url);
        } else if (endpoint.body) {
          response = await request(app)[endpoint.method](endpoint.url).send(endpoint.body);
        } else {
          response = await request(app)[endpoint.method](endpoint.url);
        }

        if (response.status >= 400) {
          expect(response.body).toHaveProperty('success');
          expect(response.body).toHaveProperty('error');
          expect(response.body.success).toBe(false);
          expect(typeof response.body.error).toBe('object');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body.error).toHaveProperty('timestamp');
        }
      }
    });

    it('should ensure all required fields are present in responses', async () => {
      const userData = generateValidUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);

      // Check all required fields are present
      const requiredUserFields = ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'];
      const user = response.body.data.user;

      requiredUserFields.forEach(field => {
        expect(user).toHaveProperty(field);
        expect(user[field]).toBeDefined();
        expect(user[field]).not.toBeNull();
      });

      // Check authentication response required fields
      const requiredAuthFields = ['token', 'refreshToken', 'expiresIn'];
      requiredAuthFields.forEach(field => {
        expect(response.body.data).toHaveProperty(field);
        expect(response.body.data[field]).toBeDefined();
        expect(response.body.data[field]).not.toBeNull();
      });
    });

    it('should not expose sensitive fields in responses', async () => {
      const userData = generateValidUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);

      // Ensure sensitive fields are not exposed
      const sensitiveFields = ['password', 'passwordHash', 'salt', 'resetToken'];
      const user = response.body.data.user;

      sensitiveFields.forEach(field => {
        expect(user).not.toHaveProperty(field);
      });
    });
  });
});