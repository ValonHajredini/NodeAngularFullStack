/**
 * Comprehensive Performance Testing Suite
 * Tests API performance across various scenarios:
 * - Response time testing for all endpoints
 * - Load testing with multiple concurrent requests
 * - Database query performance monitoring
 * - Memory usage and resource consumption testing
 * - API rate limiting and throttling tests
 */

import request from 'supertest';
import { app } from '../../src/server';
import { createTestUser, createManyTestUsers, getSeedUserTokens, authenticatedRequest } from '../helpers/auth-helper';
import { generateValidUserData, generatePerformanceTestData } from '../helpers/data-factory';

describe('Comprehensive Performance Testing Suite', () => {
  let adminAuth: any;
  let userAuth: any;

  beforeAll(async () => {
    const seedTokens = await getSeedUserTokens();
    adminAuth = seedTokens.admin;
    userAuth = seedTokens.user;
  });

  describe('Response Time Testing', () => {
    it('should respond to authentication endpoints within NFR requirements', async () => {
      const userData = generateValidUserData();

      // Test registration response time
      const registrationStartTime = Date.now();
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      const registrationTime = Date.now() - registrationStartTime;

      expect(registrationResponse.status).toBe(201);
      expect(registrationTime).toBeLessThan(2000); // NFR requirement: < 2 seconds

      // Test login response time
      const loginStartTime = Date.now();
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });
      const loginTime = Date.now() - loginStartTime;

      expect(loginResponse.status).toBe(200);
      expect(loginTime).toBeLessThan(2000); // NFR requirement: < 2 seconds

      console.log(`Performance Metrics - Registration: ${registrationTime}ms, Login: ${loginTime}ms`);
    });

    it('should respond to user profile endpoints within NFR requirements', async () => {
      // Test profile retrieval response time
      const profileStartTime = Date.now();
      const profileResponse = await authenticatedRequest(userAuth.token)
        .get('/api/v1/users/profile');
      const profileTime = Date.now() - profileStartTime;

      expect(profileResponse.status).toBe(200);
      expect(profileTime).toBeLessThan(1000); // Profile should be faster

      // Test profile update response time
      const updateStartTime = Date.now();
      const updateResponse = await authenticatedRequest(userAuth.token)
        .patch('/api/v1/users/profile')
        .send({ firstName: 'PerformanceTest' });
      const updateTime = Date.now() - updateStartTime;

      expect(updateResponse.status).toBe(200);
      expect(updateTime).toBeLessThan(1500);

      console.log(`Performance Metrics - Profile Get: ${profileTime}ms, Profile Update: ${updateTime}ms`);
    });

    it('should respond to admin endpoints within NFR requirements', async () => {
      // Test user list response time (with pagination)
      const listStartTime = Date.now();
      const listResponse = await authenticatedRequest(adminAuth.token)
        .get('/api/v1/users?page=1&limit=20');
      const listTime = Date.now() - listStartTime;

      expect(listResponse.status).toBe(200);
      expect(listTime).toBeLessThan(1500);

      // Test user creation response time
      const createStartTime = Date.now();
      const createResponse = await authenticatedRequest(adminAuth.token)
        .post('/api/v1/users')
        .send(generateValidUserData());
      const createTime = Date.now() - createStartTime;

      expect(createResponse.status).toBe(201);
      expect(createTime).toBeLessThan(2000);

      console.log(`Performance Metrics - User List: ${listTime}ms, User Create: ${createTime}ms`);
    });

    it('should measure token refresh performance', async () => {
      const testUser = await createTestUser();

      const refreshStartTime = Date.now();
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testUser.refreshToken });
      const refreshTime = Date.now() - refreshStartTime;

      expect(refreshResponse.status).toBe(200);
      expect(refreshTime).toBeLessThan(1000); // Token refresh should be fast

      console.log(`Performance Metrics - Token Refresh: ${refreshTime}ms`);
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle concurrent user registrations', async () => {
      const concurrentCount = 10;
      const performanceData = generatePerformanceTestData();

      const startTime = Date.now();
      const registrationPromises = Array.from({ length: concurrentCount }, (_, i) =>
        request(app)
          .post('/api/v1/auth/register')
          .send(generateValidUserData({ email: `load-test-${i}-${Date.now()}@example.com` }))
      );

      const responses = await Promise.all(registrationPromises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentCount;

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
      });

      // Performance assertions
      expect(totalTime).toBeLessThan(10000); // Total time should be reasonable
      expect(averageTime).toBeLessThan(2000); // Average should meet NFR

      console.log(`Concurrent Load Test - ${concurrentCount} registrations: Total: ${totalTime}ms, Average: ${averageTime}ms`);
    });

    it('should handle concurrent login attempts', async () => {
      // Create test users first
      const userCount = 5;
      const testUsers = await createManyTestUsers(userCount);

      const startTime = Date.now();
      const loginPromises = testUsers.map(user =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.user.email,
            password: 'Test123!@#'
          })
      );

      const responses = await Promise.all(loginPromises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / userCount;

      // Verify all logins succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      expect(averageTime).toBeLessThan(2000);
      console.log(`Concurrent Login Test - ${userCount} logins: Total: ${totalTime}ms, Average: ${averageTime}ms`);
    });

    it('should handle concurrent user profile requests', async () => {
      const concurrentCount = 15;

      const startTime = Date.now();
      const profilePromises = Array.from({ length: concurrentCount }, () =>
        authenticatedRequest(userAuth.token).get('/api/v1/users/profile')
      );

      const responses = await Promise.all(profilePromises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentCount;

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      expect(averageTime).toBeLessThan(1000);
      console.log(`Concurrent Profile Test - ${concurrentCount} requests: Total: ${totalTime}ms, Average: ${averageTime}ms`);
    });

    it('should handle mixed endpoint load testing', async () => {
      const operations = [
        // Authentication operations
        () => request(app).post('/api/v1/auth/register').send(generateValidUserData()),
        () => request(app).post('/api/v1/auth/login').send({ email: userAuth.user.email, password: 'UserPass123!' }),

        // User operations
        () => authenticatedRequest(userAuth.token).get('/api/v1/users/profile'),
        () => authenticatedRequest(userAuth.token).patch('/api/v1/users/profile').send({ firstName: 'LoadTest' }),

        // Admin operations
        () => authenticatedRequest(adminAuth.token).get('/api/v1/users?page=1&limit=10'),
        () => authenticatedRequest(adminAuth.token).post('/api/v1/users').send(generateValidUserData())
      ];

      const startTime = Date.now();
      const mixedPromises = Array.from({ length: 20 }, (_, i) => {
        const operation = operations[i % operations.length];
        return operation();
      });

      const responses = await Promise.all(mixedPromises);
      const totalTime = Date.now() - startTime;

      // Verify most requests succeeded (some may fail due to duplicates, etc.)
      const successfulResponses = responses.filter(r => r.status < 400);
      expect(successfulResponses.length).toBeGreaterThan(15); // Most should succeed

      expect(totalTime).toBeLessThan(15000); // Total time should be reasonable
      console.log(`Mixed Load Test - 20 operations: Total: ${totalTime}ms, Success Rate: ${successfulResponses.length}/20`);
    });
  });

  describe('Database Performance Testing', () => {
    it('should handle pagination efficiently with large datasets', async () => {
      // Create a larger dataset
      await createManyTestUsers(100);

      // Test different page sizes
      const pageSizes = [10, 20, 50];

      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?page=1&limit=${pageSize}`);
        const queryTime = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(response.body.data.users.length).toBeLessThanOrEqual(pageSize);
        expect(queryTime).toBeLessThan(1000); // Should be fast even with large dataset

        console.log(`Database Performance - Page size ${pageSize}: ${queryTime}ms`);
      }
    });

    it('should handle search queries efficiently', async () => {
      // Create users with searchable names
      await createManyTestUsers(50, { user: 50 });

      const searchTerms = ['Test', 'User', 'Admin'];

      for (const term of searchTerms) {
        const startTime = Date.now();
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?search=${term}&page=1&limit=20`);
        const searchTime = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(searchTime).toBeLessThan(1500); // Search should be reasonably fast

        console.log(`Search Performance - Term "${term}": ${searchTime}ms, Results: ${response.body.data.users.length}`);
      }
    });

    it('should handle role filtering efficiently', async () => {
      const roles = ['admin', 'user', 'readonly'];

      for (const role of roles) {
        const startTime = Date.now();
        const response = await authenticatedRequest(adminAuth.token)
          .get(`/api/v1/users?role=${role}&page=1&limit=20`);
        const filterTime = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(filterTime).toBeLessThan(1000);

        // Verify all returned users have the correct role
        response.body.data.users.forEach((user: any) => {
          expect(user.role).toBe(role);
        });

        console.log(`Role Filter Performance - ${role}: ${filterTime}ms, Results: ${response.body.data.users.length}`);
      }
    });
  });

  describe('Memory and Resource Consumption Testing', () => {
    it('should handle large request payloads efficiently', async () => {
      // Test with large but valid user data
      const largeUserData = generateValidUserData({
        firstName: 'A'.repeat(50), // Maximum allowed length
        lastName: 'B'.repeat(50)
      });

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(largeUserData);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(3000); // Should handle large payloads

      console.log(`Large Payload Performance: ${responseTime}ms`);
    });

    it('should handle multiple simultaneous sessions', async () => {
      // Create multiple user sessions
      const sessionCount = 10;
      const users = await createManyTestUsers(sessionCount);

      const startTime = Date.now();

      // Simulate multiple active sessions making requests
      const sessionPromises = users.map(user =>
        Promise.all([
          authenticatedRequest(user.token).get('/api/v1/users/profile'),
          authenticatedRequest(user.token).patch('/api/v1/users/profile').send({ firstName: 'SessionTest' })
        ])
      );

      const results = await Promise.all(sessionPromises);
      const totalTime = Date.now() - startTime;

      // Verify all sessions worked
      results.forEach((sessionResults, index) => {
        sessionResults.forEach((response, reqIndex) => {
          expect(response.status).toBeLessThan(400);
        });
      });

      expect(totalTime).toBeLessThan(10000);
      console.log(`Multiple Sessions Test - ${sessionCount} sessions: ${totalTime}ms`);
    });
  });

  describe('Rate Limiting and Throttling Tests', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const rateLimitTestData = Array.from({ length: 15 }, () => ({
        email: 'ratelimit@example.com',
        password: 'wrongpassword'
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        rateLimitTestData.map(data =>
          request(app)
            .post('/api/v1/auth/login')
            .send(data)
        )
      );
      const totalTime = Date.now() - startTime;

      // Should eventually hit rate limit
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Remaining requests should be rejected quickly due to rate limiting
      const successfulAuthErrors = responses.filter(r => r.status === 401);
      const totalRequests = responses.length;

      console.log(`Rate Limit Test - Total: ${totalTime}ms, Rate Limited: ${rateLimitedResponses.length}/${totalRequests}`);
    });

    it('should handle burst traffic gracefully', async () => {
      // Create a burst of legitimate requests
      const burstSize = 20;
      const testUser = await createTestUser();

      const startTime = Date.now();
      const burstPromises = Array.from({ length: burstSize }, () =>
        authenticatedRequest(testUser.token).get('/api/v1/users/profile')
      );

      const responses = await Promise.all(burstPromises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / burstSize;

      // Most requests should succeed (some may be rate limited)
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeGreaterThan(burstSize * 0.5); // At least 50% should succeed

      console.log(`Burst Traffic Test - ${burstSize} requests: Total: ${totalTime}ms, Average: ${averageTime}ms, Success: ${successfulRequests.length}, Rate Limited: ${rateLimited.length}`);
    });
  });

  describe('Performance Benchmarking and Monitoring', () => {
    it('should establish performance baselines', async () => {
      const benchmarks = {
        registration: [],
        login: [],
        profileGet: [],
        profileUpdate: [],
        userList: []
      } as { [key: string]: number[] };

      // Run each operation multiple times to get average
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        // Registration benchmark
        const regData = generateValidUserData();
        const regStart = Date.now();
        await request(app).post('/api/v1/auth/register').send(regData);
        benchmarks.registration.push(Date.now() - regStart);

        // Login benchmark
        const loginStart = Date.now();
        await request(app).post('/api/v1/auth/login').send({
          email: regData.email,
          password: regData.password
        });
        benchmarks.login.push(Date.now() - loginStart);

        // Profile operations benchmark
        const profileStart = Date.now();
        await authenticatedRequest(userAuth.token).get('/api/v1/users/profile');
        benchmarks.profileGet.push(Date.now() - profileStart);

        const updateStart = Date.now();
        await authenticatedRequest(userAuth.token)
          .patch('/api/v1/users/profile')
          .send({ firstName: `Benchmark${i}` });
        benchmarks.profileUpdate.push(Date.now() - updateStart);

        // User list benchmark
        const listStart = Date.now();
        await authenticatedRequest(adminAuth.token).get('/api/v1/users?page=1&limit=10');
        benchmarks.userList.push(Date.now() - listStart);
      }

      // Calculate and log averages
      Object.entries(benchmarks).forEach(([operation, times]) => {
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log(`Benchmark ${operation}: Avg: ${average.toFixed(2)}ms, Min: ${min}ms, Max: ${max}ms`);

        // Assert performance baselines
        expect(average).toBeLessThan(2000); // All operations should average under 2s
      });
    });

    it('should monitor for performance regressions', async () => {
      // This test could be expanded to compare against historical benchmarks
      const testOperations = [
        {
          name: 'Quick Authentication',
          operation: () => request(app).post('/api/v1/auth/login').send({
            email: userAuth.user.email,
            password: 'UserPass123!'
          }),
          expectedMaxTime: 1500
        },
        {
          name: 'Profile Retrieval',
          operation: () => authenticatedRequest(userAuth.token).get('/api/v1/users/profile'),
          expectedMaxTime: 800
        },
        {
          name: 'User List (Cached)',
          operation: () => authenticatedRequest(adminAuth.token).get('/api/v1/users?page=1&limit=10'),
          expectedMaxTime: 1000
        }
      ];

      for (const test of testOperations) {
        const startTime = Date.now();
        const response = await test.operation();
        const responseTime = Date.now() - startTime;

        expect(response.status).toBeLessThan(400);
        expect(responseTime).toBeLessThan(test.expectedMaxTime);

        console.log(`Regression Test - ${test.name}: ${responseTime}ms (Expected < ${test.expectedMaxTime}ms)`);
      }
    });
  });
});