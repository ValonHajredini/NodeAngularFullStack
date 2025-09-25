import request from 'supertest';
import { Server } from 'http';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';

/**
 * Integration tests for API token usage tracking and analytics.
 * Tests the complete flow from token creation through usage tracking
 * to analytics endpoints as defined in Story 5.3.
 */
describe('API Token Usage Integration Tests', () => {
  let server: Server;
  let authToken: string;
  let apiToken: string;
  let apiTokenId: string;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0);
  });

  afterAll(async () => {
    // Clean up server and database connections
    if (server) {
      server.close();
    }
    await databaseService.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await databaseService.query('DELETE FROM api_token_usage WHERE 1=1');
    await databaseService.query('DELETE FROM api_tokens WHERE 1=1');
    await databaseService.query('DELETE FROM sessions WHERE 1=1');
    await databaseService.query("DELETE FROM users WHERE email LIKE '%test%'");

    // Create a test user and get JWT token
    const userResponse = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'token-test@example.com',
        password: 'TestPassword123!',
        name: 'Token Test User',
        role: 'user',
      });

    expect(userResponse.status).toBe(201);

    // Login to get JWT token
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'token-test@example.com',
        password: 'TestPassword123!',
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.data.accessToken;

    // Create an API token for testing
    const tokenResponse = await request(server)
      .post('/api/v1/tokens')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test API Token',
        scopes: ['read', 'write'],
      });

    expect(tokenResponse.status).toBe(201);
    apiToken = tokenResponse.body.data.token;
    apiTokenId = tokenResponse.body.data.id;
  });

  describe('API Token Authentication with Usage Tracking', () => {
    it('should authenticate API requests using token and track usage', async () => {
      // Make API request using the API token
      const response = await request(server)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify usage was logged to database
      const usageQuery = await databaseService.query(
        'SELECT * FROM api_token_usage WHERE token_id = $1',
        [apiTokenId]
      );

      expect(usageQuery.rows).toHaveLength(1);
      const usageRecord = usageQuery.rows[0];

      expect(usageRecord.endpoint).toBe('/api/v1/users/profile');
      expect(usageRecord.method).toBe('GET');
      expect(usageRecord.response_status).toBe(200);
      expect(usageRecord.processing_time).toBeGreaterThan(0);
      expect(usageRecord.ip_address).toBeDefined();
      expect(usageRecord.timestamp).toBeDefined();
    });

    it('should track failed API requests with API tokens', async () => {
      // Make API request to non-existent endpoint
      const response = await request(server)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${apiToken}`);

      expect(response.status).toBe(404);

      // Verify failed usage was logged
      const usageQuery = await databaseService.query(
        'SELECT * FROM api_token_usage WHERE token_id = $1 AND response_status = 404',
        [apiTokenId]
      );

      expect(usageQuery.rows).toHaveLength(1);
      const usageRecord = usageQuery.rows[0];

      expect(usageRecord.endpoint).toBe('/api/v1/nonexistent');
      expect(usageRecord.method).toBe('GET');
      expect(usageRecord.response_status).toBe(404);
    });

    it('should not track usage for JWT token requests', async () => {
      // Make API request using JWT token
      const response = await request(server)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify no usage was logged for JWT token
      const usageQuery = await databaseService.query(
        'SELECT * FROM api_token_usage WHERE 1=1'
      );

      expect(usageQuery.rows).toHaveLength(0);
    });
  });

  describe('Token Usage History Endpoint', () => {
    beforeEach(async () => {
      // Create some test usage data
      const usageData = [
        {
          token_id: apiTokenId,
          endpoint: '/api/v1/users/profile',
          method: 'GET',
          response_status: 200,
          processing_time: 150,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent',
        },
        {
          token_id: apiTokenId,
          endpoint: '/api/v1/users',
          method: 'GET',
          response_status: 200,
          processing_time: 75,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent',
        },
        {
          token_id: apiTokenId,
          endpoint: '/api/v1/users/profile',
          method: 'PUT',
          response_status: 400,
          processing_time: 25,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent',
        },
      ];

      for (const usage of usageData) {
        await databaseService.query(
          `INSERT INTO api_token_usage (token_id, endpoint, method, response_status, processing_time, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            usage.token_id,
            usage.endpoint,
            usage.method,
            usage.response_status,
            usage.processing_time,
            usage.ip_address,
            usage.user_agent,
          ]
        );
      }
    });

    it('should return paginated token usage history', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage?page=1&limit=2`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });

    it('should filter usage by status code', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage?status=400`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usage).toHaveLength(1);
      expect(response.body.data.usage[0].responseStatus).toBe(400);
    });

    it('should filter usage by endpoint', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage?endpoint=profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usage).toHaveLength(2);
      response.body.data.usage.forEach((usage: any) => {
        expect(usage.endpoint).toContain('profile');
      });
    });

    it('should reject access to usage for tokens not owned by user', async () => {
      // Create another user and token
      await request(server).post('/api/v1/auth/register').send({
        email: 'other-user@example.com',
        password: 'TestPassword123!',
        name: 'Other User',
        role: 'user',
      });

      const otherLoginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'other-user@example.com',
          password: 'TestPassword123!',
        });

      const otherAuthToken = otherLoginResponse.body.data.accessToken;

      // Try to access usage for the first user's token
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage`)
        .set('Authorization', `Bearer ${otherAuthToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Token Usage Statistics Endpoint', () => {
    beforeEach(async () => {
      // Create comprehensive test usage data
      const usageData = [
        // Successful requests
        { endpoint: '/api/v1/users', method: 'GET', status: 200, time: 100 },
        { endpoint: '/api/v1/users', method: 'GET', status: 200, time: 150 },
        {
          endpoint: '/api/v1/users/profile',
          method: 'GET',
          status: 200,
          time: 75,
        },
        {
          endpoint: '/api/v1/users/profile',
          method: 'PUT',
          status: 200,
          time: 250,
        },
        // Failed requests
        { endpoint: '/api/v1/users/999', method: 'GET', status: 404, time: 50 },
        {
          endpoint: '/api/v1/users/profile',
          method: 'PUT',
          status: 400,
          time: 25,
        },
      ];

      for (const usage of usageData) {
        await databaseService.query(
          `INSERT INTO api_token_usage (token_id, endpoint, method, response_status, processing_time, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            apiTokenId,
            usage.endpoint,
            usage.method,
            usage.status,
            usage.time,
            '127.0.0.1',
          ]
        );
      }
    });

    it('should return comprehensive usage statistics', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const stats = response.body.data;
      expect(stats.totalRequests).toBe(6);
      expect(stats.successfulRequests).toBe(4);
      expect(stats.failedRequests).toBe(2);
      expect(stats.averageResponseTime).toBeCloseTo(108.33, 1);

      // Check top endpoints
      expect(stats.topEndpoints).toHaveLength(3);
      const topEndpoint = stats.topEndpoints.find(
        (e: any) => e.endpoint === '/api/v1/users'
      );
      expect(topEndpoint.count).toBe(2);

      // Check requests by status
      expect(stats.requestsByStatus).toHaveLength(3);
      const status200 = stats.requestsByStatus.find(
        (s: any) => s.status === 200
      );
      expect(status200.count).toBe(4);
    });

    it('should filter statistics by date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(server)
        .get(
          `/api/v1/tokens/${apiTokenId}/usage/stats?from=2024-01-01&to=${tomorrow.toISOString()}`
        )
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalRequests).toBe(6);
    });
  });

  describe('Token Usage Time Series Endpoint', () => {
    it('should return time series usage data', async () => {
      // Create usage data for the past few days
      const today = new Date();
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        await databaseService.query(
          `INSERT INTO api_token_usage (token_id, endpoint, method, response_status, processing_time, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [apiTokenId, '/api/v1/users', 'GET', 200, 100, date.toISOString()]
        );
      }

      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage/timeseries?period=day`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const timeSeries = response.body.data;
      expect(timeSeries.period).toBe('day');
      expect(timeSeries.data).toHaveLength(3);
      expect(timeSeries.data[0].requests).toBe(1);
      expect(timeSeries.data[0].averageResponseTime).toBe(100);
    });

    it('should validate period parameter', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage/timeseries?period=invalid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PERIOD');
    });
  });

  describe('JWT Authentication Compatibility', () => {
    it('should continue to work with existing JWT authentication', async () => {
      // Test that existing JWT authentication still works
      const response = await request(server)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify no usage was logged for JWT requests
      const usageQuery = await databaseService.query(
        'SELECT * FROM api_token_usage WHERE 1=1'
      );
      expect(usageQuery.rows).toHaveLength(0);
    });

    it('should handle invalid tokens appropriately', async () => {
      const response = await request(server)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(server).get('/api/v1/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Token Usage Repository Edge Cases', () => {
    it('should handle empty usage history gracefully', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usage).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should handle large page sizes appropriately', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage?limit=1000`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should be capped at 100 as per controller implementation
      expect(response.body.data.pagination.limit).toBe(100);
    });

    it('should validate date parameters', async () => {
      const response = await request(server)
        .get(`/api/v1/tokens/${apiTokenId}/usage?from=invalid-date`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DATE');
    });
  });
});
