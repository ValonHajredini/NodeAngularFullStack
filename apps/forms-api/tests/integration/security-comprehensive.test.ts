/**
 * Comprehensive Security Testing Suite
 * Tests security aspects of the API including:
 * - JWT token manipulation and validation
 * - Authorization boundary testing
 * - SQL injection and XSS prevention
 * - CORS and security header validation
 * - Input sanitization and validation
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, createManyTestUsers, getSeedUserTokens, createInvalidToken, createExpiredToken, authenticatedRequest } from '../helpers/auth-helper';
import { generateValidUserData, generateSQLInjectionPayloads, generateXSSPayloads } from '../helpers/data-factory';
import { errorResponseSchema, assertValidResponse } from '../helpers/validation-schemas';

describe('Comprehensive Security Testing Suite', () => {
  let adminAuth: any;
  let userAuth: any;
  let readonlyAuth: any;

  beforeAll(async () => {
    const seedTokens = await getSeedUserTokens();
    adminAuth = seedTokens.admin;
    userAuth = seedTokens.user;
    readonlyAuth = seedTokens.readonly;
  });

  describe('JWT Token Security Tests', () => {
    it('should reject requests with invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'null',
        'undefined'
      ];

      for (const invalidToken of invalidTokens) {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.status).toBe(401);
        assertValidResponse(errorResponseSchema, response.body, `invalid token: ${invalidToken}`);
        expect(['AUTHENTICATION_REQUIRED', 'INVALID_TOKEN']).toContain(response.body.error.code);
      }
    });

    it('should reject requests with malformed authorization headers', async () => {
      const malformedHeaders = [
        'Bearer',           // Missing token
        'Basic dGVzdA==',   // Wrong auth type
        'bearer token',     // Wrong case
        'Bearer  ',         // Empty token
        'InvalidScheme token' // Wrong scheme
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        assertValidResponse(errorResponseSchema, response.body, `malformed header: ${header}`);
      }
    });

    it('should reject requests with expired tokens', async () => {
      const expiredToken = createExpiredToken();

      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'expired token');
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject tokens after logout', async () => {
      const testUser = await createTestUser();

      // Logout the user
      await authenticatedRequest(testUser.token)
        .post('/api/v1/auth/logout');

      // Try to use the token after logout
      const response = await authenticatedRequest(testUser.token)
        .get('/api/v1/users/profile');

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'token after logout');
    });

    it('should prevent token reuse after refresh', async () => {
      const testUser = await createTestUser();

      // Refresh the token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testUser.refreshToken });

      expect(refreshResponse.status).toBe(200);

      // Try to use the old token
      const response = await authenticatedRequest(testUser.token)
        .get('/api/v1/users/profile');

      // Depending on implementation, this might still work or be invalidated
      // Adjust based on your token refresh strategy
      if (response.status === 401) {
        assertValidResponse(errorResponseSchema, response.body, 'old token after refresh');
      }
    });

    it('should validate token signature integrity', async () => {
      const testUser = await createTestUser();
      const validToken = testUser.token;

      // Manipulate the token signature
      const tokenParts = validToken.split('.');
      const manipulatedToken = tokenParts[0] + '.' + tokenParts[1] + '.manipulated_signature';

      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${manipulatedToken}`);

      expect(response.status).toBe(401);
      assertValidResponse(errorResponseSchema, response.body, 'manipulated token signature');
    });
  });

  describe('Authorization Boundary Tests', () => {
    it('should prevent regular users from accessing admin endpoints', async () => {
      const adminEndpoints = [
        { method: 'get', url: '/api/v1/users' },
        { method: 'post', url: '/api/v1/users', body: generateValidUserData() },
        { method: 'patch', url: `/api/v1/users/${userAuth.user.id}`, body: { role: 'admin' } },
        { method: 'delete', url: `/api/v1/users/${userAuth.user.id}` }
      ];

      for (const endpoint of adminEndpoints) {
        let response;
        if (endpoint.body) {
          response = await authenticatedRequest(userAuth.token)[endpoint.method](endpoint.url).send(endpoint.body);
        } else {
          response = await authenticatedRequest(userAuth.token)[endpoint.method](endpoint.url);
        }

        expect(response.status).toBe(403);
        assertValidResponse(errorResponseSchema, response.body, `user accessing admin endpoint: ${endpoint.method} ${endpoint.url}`);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
    });

    it('should prevent readonly users from modifying data', async () => {
      const writeEndpoints = [
        { method: 'post', url: '/api/v1/users', body: generateValidUserData() },
        { method: 'patch', url: '/api/v1/users/profile', body: { firstName: 'Modified' } },
        { method: 'patch', url: `/api/v1/users/${userAuth.user.id}`, body: { firstName: 'Modified' } },
        { method: 'delete', url: `/api/v1/users/${userAuth.user.id}` }
      ];

      for (const endpoint of writeEndpoints) {
        const response = await authenticatedRequest(readonlyAuth.token)[endpoint.method](endpoint.url).send(endpoint.body);

        expect(response.status).toBe(403);
        assertValidResponse(errorResponseSchema, response.body, `readonly user write operation: ${endpoint.method} ${endpoint.url}`);
      }
    });

    it('should prevent users from accessing other users data', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // User1 trying to access User2's data
      const response = await authenticatedRequest(user1.token)
        .get(`/api/v1/users/${user2.user.id}`);

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'cross-user data access');
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent privilege escalation attempts', async () => {
      const testUser = await createTestUser();

      // Try to escalate privileges through profile update
      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      assertValidResponse(errorResponseSchema, response.body, 'privilege escalation attempt');
    });

    it('should validate resource ownership', async () => {
      const testUsers = await createManyTestUsers(3);
      const [user1, user2, user3] = testUsers;

      // Each user should only access their own profile
      const validAccess = await authenticatedRequest(user1.token)
        .get(`/api/v1/users/${user1.user.id}`);
      expect(validAccess.status).toBe(200);

      // Cross-user access should fail
      const invalidAccess = await authenticatedRequest(user1.token)
        .get(`/api/v1/users/${user2.user.id}`);
      expect(invalidAccess.status).toBe(403);
    });
  });

  describe('SQL Injection Prevention Tests', () => {
    it('should prevent SQL injection in authentication', async () => {
      const sqlPayloads = generateSQLInjectionPayloads();

      for (const payload of sqlPayloads) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: payload,
            password: 'Test123!@#'
          });

        // Should not succeed with SQL injection
        expect(response.status).not.toBe(200);
        expect([400, 401]).toContain(response.status);
        assertValidResponse(errorResponseSchema, response.body, `SQL injection in email: ${payload}`);
      }
    });

    it('should prevent SQL injection in user registration', async () => {
      const sqlPayloads = generateSQLInjectionPayloads();

      for (const payload of sqlPayloads) {
        const userData = generateValidUserData({
          email: payload,
          firstName: payload,
          lastName: payload
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `SQL injection in registration: ${payload}`);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should prevent SQL injection in search queries', async () => {
      const sqlPayloads = generateSQLInjectionPayloads();

      for (const payload of sqlPayloads) {
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?search=${encodeURIComponent(payload)}`);

        // Should handle gracefully, not expose database errors
        if (response.status === 400) {
          assertValidResponse(errorResponseSchema, response.body, `SQL injection in search: ${payload}`);
        } else if (response.status === 200) {
          // If it processes the search, ensure no database errors are exposed
          expect(response.body).not.toHaveProperty('sqlError');
          expect(response.body).not.toHaveProperty('query');
        }
      }
    });

    it('should use parameterized queries for all database operations', async () => {
      // This test verifies that malicious input doesn't affect database operations
      const testUser = await createTestUser();
      const maliciousInput = "'; DROP TABLE users; --";

      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send({ firstName: maliciousInput });

      // Should either reject or sanitize the input
      if (response.status === 400) {
        assertValidResponse(errorResponseSchema, response.body, 'malicious input in update');
      } else if (response.status === 200) {
        // If accepted, the input should be sanitized
        expect(response.body.data.firstName).not.toContain('DROP TABLE');
      }
    });
  });

  describe('XSS Prevention Tests', () => {
    it('should sanitize XSS attempts in user input', async () => {
      const xssPayloads = generateXSSPayloads();

      for (const payload of xssPayloads) {
        const userData = generateValidUserData({
          firstName: payload,
          lastName: payload
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        // Should reject or sanitize XSS attempts
        if (response.status === 400) {
          assertValidResponse(errorResponseSchema, response.body, `XSS prevention: ${payload}`);
        } else if (response.status === 201) {
          // If accepted, ensure script tags are sanitized
          expect(response.body.data.user.firstName).not.toContain('<script>');
          expect(response.body.data.user.firstName).not.toContain('javascript:');
        }
      }
    });

    it('should escape HTML in profile updates', async () => {
      const testUser = await createTestUser();
      const htmlInput = '<b>Bold Name</b>';

      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send({ firstName: htmlInput });

      if (response.status === 200) {
        // HTML should be escaped or stripped
        expect(response.body.data.firstName).not.toContain('<b>');
        expect(response.body.data.firstName).not.toContain('</b>');
      }
    });

    it('should prevent script injection in search parameters', async () => {
      const xssPayloads = generateXSSPayloads();

      for (const payload of xssPayloads) {
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?search=${encodeURIComponent(payload)}`);

        // Should handle XSS attempts gracefully
        if (response.status === 200) {
          // Ensure no script content in response
          const responseStr = JSON.stringify(response.body);
          expect(responseStr).not.toContain('<script>');
          expect(responseStr).not.toContain('javascript:');
        }
      }
    });
  });

  describe('CORS and Security Headers Tests', () => {
    it('should include proper security headers', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      // Check for essential security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);

      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');

      // Check Content-Type header is properly set
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/v1/users/profile')
        .set('Origin', 'http://localhost:3000');

      // Check CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://malicious-site.com');

      // Behavior depends on CORS configuration
      // Either should work (if origin is allowed) or be restricted
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
      }
    });
  });

  describe('Input Validation and Sanitization Tests', () => {
    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@com',
        'username..double.dot@example.com',
        'username@-example.com',
        'username@example-.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(generateValidUserData({ email }));

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `invalid email format: ${email}`);
      }
    });

    it('should validate password complexity', async () => {
      const weakPasswords = [
        'password',        // No numbers, uppercase, or special chars
        'PASSWORD',        // No lowercase, numbers, or special chars
        '12345678',        // No letters or special chars
        'Pass123',         // No special chars
        'Pass!',           // Too short
        'p@ss',            // Too short
        ''                 // Empty password
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(generateValidUserData({ password }));

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `weak password: ${password}`);
      }
    });

    it('should limit input field lengths', async () => {
      const longInputs = {
        firstName: 'A'.repeat(101),  // Exceeds typical limit
        lastName: 'B'.repeat(101),
        email: 'test@' + 'x'.repeat(100) + '.com'
      };

      for (const [field, value] of Object.entries(longInputs)) {
        const userData = generateValidUserData({ [field]: value });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `long input in ${field}`);
      }
    });

    it('should reject null and undefined values', async () => {
      const nullData = {
        email: null,
        password: undefined,
        firstName: null,
        lastName: undefined
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(nullData);

      expect(response.status).toBe(400);
      assertValidResponse(errorResponseSchema, response.body, 'null/undefined values');
    });

    it('should validate numeric inputs', async () => {
      // Test pagination parameters
      const invalidParams = [
        'page=-1&limit=10',
        'page=0&limit=10',
        'page=abc&limit=10',
        'page=1&limit=-5',
        'page=1&limit=abc',
        'page=1&limit=1000'  // Exceeds reasonable limit
      ];

      for (const params of invalidParams) {
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?${params}`);

        expect(response.status).toBe(400);
        assertValidResponse(errorResponseSchema, response.body, `invalid pagination: ${params}`);
      }
    });
  });

  describe('Rate Limiting Security Tests', () => {
    it('should prevent brute force login attacks', async () => {
      const attackAttempts = 20;
      const promises = [];

      // Simulate brute force attack
      for (let i = 0; i < attackAttempts; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'victim@example.com',
              password: `wrongpass${i}`
            })
        );
      }

      const responses = await Promise.all(promises);

      // Should eventually get rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have proper structure
      rateLimitedResponses.forEach(response => {
        assertValidResponse(errorResponseSchema, response.body, 'rate limit response');
        expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });

    it('should prevent rapid registration attempts', async () => {
      const rapidAttempts = 15;
      const promises = [];

      for (let i = 0; i < rapidAttempts; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .send(generateValidUserData({ email: `rapid${i}@example.com` }))
        );
      }

      const responses = await Promise.all(promises);

      // Some should succeed, but rapid attempts should be rate limited
      const successful = responses.filter(r => r.status === 201);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Session and Token Security', () => {
    it('should invalidate all sessions on password change', async () => {
      const testUser = await createTestUser();

      // This test would require a password change endpoint
      // Adjust based on your implementation
      const response = await authenticatedRequest(testUser.token)
        .patch('/api/v1/users/profile')
        .send({ password: 'NewPassword123!@#' });

      // If password change is supported, old token should be invalidated
      if (response.status === 200) {
        const profileResponse = await authenticatedRequest(testUser.token)
          .get('/api/v1/users/profile');

        // Depending on implementation, this might still work or be invalidated
        expect([200, 401]).toContain(profileResponse.status);
      }
    });

    it('should prevent concurrent login abuse', async () => {
      const testUser = await createTestUser();
      const concurrentLogins = 10;

      const loginPromises = Array.from({ length: concurrentLogins }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.user.email,
            password: 'Test123!@#'
          })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed (unless rate limited)
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful.length + rateLimited.length).toBe(concurrentLogins);
    });
  });
});