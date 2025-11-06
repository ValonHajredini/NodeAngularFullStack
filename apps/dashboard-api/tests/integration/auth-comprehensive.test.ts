/**
 * Comprehensive Authentication Endpoint Tests
 * Tests all authentication flows with various scenarios including:
 * - User registration (valid/invalid data)
 * - Login/logout (correct/incorrect credentials)
 * - JWT token refresh and expiration
 * - Password reset flows
 * - Token invalidation
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, loginUser, createInvalidToken, createExpiredToken } from '../helpers/auth-helper';
import { generateValidUserData, generateInvalidUserData, generateSQLInjectionPayloads, generateXSSPayloads } from '../helpers/data-factory';
import { authResponseSchema, errorResponseSchema, tokenRefreshResponseSchema, passwordResetRequestResponseSchema, logoutResponseSchema, assertValidResponse } from '../helpers/validation-schemas';

describe('Comprehensive Authentication Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    describe('Valid Registration Scenarios', () => {
      it('should register user with valid data and return proper response structure', async () => {
        const userData = generateValidUserData();

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(201);

        // Validate response structure
        assertValidResponse(authResponseSchema, response.body, 'user registration');

        // Verify user data
        expect(response.body.data.user.email).toBe(userData.email);
        expect(response.body.data.user.firstName).toBe(userData.firstName);
        expect(response.body.data.user.lastName).toBe(userData.lastName);
        expect(response.body.data.user.role).toBe(userData.role);
        expect(response.body.data.user).not.toHaveProperty('password');

        // Verify tokens are provided
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        expect(response.body.data.expiresIn).toBeGreaterThan(0);
      });

      it('should register users with different roles', async () => {
        const roles = ['admin', 'user', 'readonly'] as const;

        for (const role of roles) {
          const userData = generateValidUserData({ role });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData);

          expect(response.status).toBe(201);
          expect(response.body.data.user.role).toBe(role);
          assertValidResponse(authResponseSchema, response.body, `${role} registration`);
        }
      });

      it('should handle unicode characters in names', async () => {
        const userData = generateValidUserData({
          firstName: 'José',
          lastName: 'García'
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(201);
        expect(response.body.data.user.firstName).toBe('José');
        expect(response.body.data.user.lastName).toBe('García');
      });
    });

    describe('Invalid Registration Scenarios', () => {
      it('should reject registration with invalid email formats', async () => {
        const invalidData = generateInvalidUserData();

        for (const invalidEmail of invalidData.invalidEmails) {
          const userData = generateValidUserData({ email: invalidEmail });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData);

          expect(response.status).toBe(400);
          assertValidResponse(errorResponseSchema, response.body, `invalid email: ${invalidEmail}`);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should reject registration with weak passwords', async () => {
        const invalidData = generateInvalidUserData();

        for (const invalidPassword of invalidData.invalidPasswords) {
          const userData = generateValidUserData({ password: invalidPassword });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData);

          expect(response.status).toBe(400);
          assertValidResponse(errorResponseSchema, response.body, `weak password test`);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        }
      });

      it('should reject registration with invalid names', async () => {
        const invalidData = generateInvalidUserData();

        for (const invalidName of invalidData.invalidNames) {
          const userData = generateValidUserData({ firstName: invalidName });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData);

          expect(response.status).toBe(400);
          assertValidResponse(errorResponseSchema, response.body, `invalid name: ${invalidName}`);
        }
      });

      it('should reject registration with duplicate email', async () => {
        const userData = generateValidUserData();

        // Register first user
        await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        // Try to register with same email
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(409);
        assertValidResponse(errorResponseSchema, response.body, 'duplicate email');
        expect(response.body.error.code).toBe('USER_EXISTS');
      });

      it('should prevent SQL injection in registration', async () => {
        const sqlPayloads = generateSQLInjectionPayloads();

        for (const payload of sqlPayloads) {
          const userData = generateValidUserData({ email: payload });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData);

          expect(response.status).toBe(400);
          assertValidResponse(errorResponseSchema, response.body, `SQL injection test`);
        }
      });

      it('should sanitize XSS attempts in registration', async () => {
        const xssPayloads = generateXSSPayloads();

        for (const payload of xssPayloads) {
          const userData = generateValidUserData({ firstName: payload });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(userData);

          expect(response.status).toBe(400);
          assertValidResponse(errorResponseSchema, response.body, `XSS test`);
        }
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    describe('Valid Login Scenarios', () => {
      it('should login with correct credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.user.email,
            password: 'Test123!@#'
          });

        expect(response.status).toBe(200);
        assertValidResponse(authResponseSchema, response.body, 'successful login');

        expect(response.body.data.user.id).toBe(testUser.user.id);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      });

      it('should login case-insensitive email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.user.email.toUpperCase(),
            password: 'Test123!@#'
          });

        expect(response.status).toBe(200);
        assertValidResponse(authResponseSchema, response.body, 'case-insensitive email login');
      });
    });

    describe('Invalid Login Scenarios', () => {
      it('should reject login with incorrect password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.user.email,
            password: 'WrongPassword123!'
          });

        expect(response.status).toBe(401);
        assertValidResponse(errorResponseSchema, response.body, 'incorrect password');
        expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should reject login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Test123!@#'
          });

        expect(response.status).toBe(401);
        assertValidResponse(errorResponseSchema, response.body, 'non-existent email');
        expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should reject login with missing credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({});

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, 'missing credentials');
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should prevent brute force attacks with rate limiting', async () => {
        const promises = [];

        // Attempt multiple failed logins
        for (let i = 0; i < 10; i++) {
          promises.push(
            request(app)
              .post('/api/v1/auth/login')
              .send({
                email: testUser.user.email,
                password: 'WrongPassword123!'
              })
          );
        }

        const responses = await Promise.all(promises);

        // Should eventually get rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: testUser.refreshToken
        });

      expect(response.status).toBe(200);
      assertValidResponse(tokenRefreshResponseSchema, response.body, 'token refresh');

      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.token).not.toBe(testUser.token);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: createInvalidToken()
        });

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'invalid refresh token');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject refresh with expired token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: createExpiredToken()
        });

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'expired refresh token');
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /api/v1/auth/password-reset', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should send password reset email for valid user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password-reset')
        .send({
          email: testUser.user.email
        });

      expect(response.status).toBe(200);
      assertValidResponse(passwordResetRequestResponseSchema, response.body, 'password reset request');
      expect(response.body.data.message).toContain('reset');
    });

    it('should handle password reset for non-existent user gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password-reset')
        .send({
          email: 'nonexistent@example.com'
        });

      // Should return success to prevent email enumeration
      expect(response.status).toBe(200);
      assertValidResponse(passwordResetRequestResponseSchema, response.body, 'non-existent user reset');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('should logout user and invalidate token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      assertValidResponse(logoutResponseSchema, response.body, 'logout');

      // Try to use the token after logout - should fail
      const protectedResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(protectedResponse.status).toBe(401);
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${createInvalidToken()}`);

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'logout with invalid token');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'logout without token');
    });
  });

  describe('Authentication Performance Tests', () => {
    it('should handle registration within performance requirements', async () => {
      const startTime = Date.now();
      const userData = generateValidUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(2000); // NFR requirement
    });

    it('should handle login within performance requirements', async () => {
      const testUser = await createTestUser();
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.user.email,
          password: 'Test123!@#'
        });

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // NFR requirement
    });

    it('should handle concurrent registrations', async () => {
      const concurrentRequests = 10;
      const userPromises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/v1/auth/register')
          .send(generateValidUserData({ email: `concurrent-${i}@example.com` }))
      );

      const responses = await Promise.all(userPromises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        assertValidResponse(authResponseSchema, response.body, `concurrent registration ${index}`);
      });
    });
  });
});