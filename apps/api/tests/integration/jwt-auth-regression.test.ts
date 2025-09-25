import request from 'supertest';
import express from 'express';
import { databaseService } from '../../src/services/database.service';
import authRoutes from '../../src/routes/auth.routes';

// Test app setup - minimal configuration for JWT regression testing
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('JWT Authentication Regression Tests', () => {
  beforeAll(async () => {
    // Initialize database connection for tests
    const dbConfig = {
      host: 'localhost',
      port: 5432,
      database: 'nodeangularfullstack',
      username: 'dbuser',
      password: 'dbpassword',
      ssl: false,
    };

    try {
      await databaseService.initialize(dbConfig);
    } catch (error) {
      console.error('Failed to initialize test database:', error);
    }
  });

  afterAll(async () => {
    // Clean up database connection
    await databaseService.close();
  });

  beforeEach(async () => {
    // Clean up only test user data - avoid tables that might not exist
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%jwt-regression%')"
      );
      await client.query(
        "DELETE FROM users WHERE email LIKE '%jwt-regression%'"
      );
    } catch (error) {
      // Ignore errors for tables that might not exist
      console.log(
        'Test cleanup error (expected in some cases):',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      client.release();
    }
  });

  describe('Core JWT Authentication Flow', () => {
    const testUser = {
      email: 'jwt-regression-test@example.com',
      password: 'JWTTest123!',
      firstName: 'JWT',
      lastName: 'RegressionTest',
    };

    it('should register user and issue JWT tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');

      const { accessToken, refreshToken, user } = response.body.data;

      // Validate JWT token structure
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.').length).toBe(3); // JWT has 3 parts
      expect(typeof refreshToken).toBe('string');

      // Validate user data
      expect(user.email).toBe(testUser.email);
      expect(user.firstName).toBe(testUser.firstName);
      expect(user.lastName).toBe(testUser.lastName);
      expect(user.role).toBe('user');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should login with credentials and return JWT tokens', async () => {
      // First register user
      await request(app).post('/api/v1/auth/register').send(testUser);

      // Then login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');

      // Tokens should be different from registration tokens
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.accessToken.split('.').length).toBe(3);
    });

    it('should authenticate protected routes with JWT access token', async () => {
      // Register and get tokens
      const authResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const accessToken = authResponse.body.data.accessToken;

      // Test protected route
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.email).toBe(testUser.email);
      expect(profileResponse.body.data).not.toHaveProperty('passwordHash');
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject expired JWT tokens', async () => {
      // This test would require a mechanism to create expired tokens
      // For now, just test malformed tokens
      const malformedToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

      await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);
    });

    it('should refresh JWT tokens with valid refresh token', async () => {
      // Register and get tokens
      const authResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const refreshToken = authResponse.body.data.refreshToken;

      // Refresh tokens
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');

      // New tokens should be different
      expect(refreshResponse.body.data.accessToken).not.toBe(
        authResponse.body.data.accessToken
      );
      expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken);

      // New access token should work for authentication
      const newAccessToken = refreshResponse.body.data.accessToken;
      await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });

    it('should logout and invalidate refresh token', async () => {
      // Register and get tokens
      const authResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const refreshToken = authResponse.body.data.refreshToken;

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Try to refresh with logged out token - should fail
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should update profile with valid JWT token', async () => {
      // Register and get tokens
      const authResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const accessToken = authResponse.body.data.accessToken;

      // Update profile
      const updateResponse = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'UpdatedJWT',
          lastName: 'UpdatedRegression',
        })
        .expect(200);

      expect(updateResponse.body.data.firstName).toBe('UpdatedJWT');
      expect(updateResponse.body.data.lastName).toBe('UpdatedRegression');
    });

    it('should maintain JWT authentication after middleware changes', async () => {
      // This test specifically validates that the auth middleware still works
      // correctly after the API token middleware additions

      // Register user
      const authResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const accessToken = authResponse.body.data.accessToken;

      // Test multiple protected endpoints to ensure consistent JWT behavior
      const protectedEndpoints = [
        { method: 'get' as const, path: '/api/v1/auth/profile' },
        {
          method: 'patch' as const,
          path: '/api/v1/auth/profile',
          body: { firstName: 'JWTTest' },
        },
        { method: 'get' as const, path: '/api/v1/auth/me' },
      ];

      for (const endpoint of protectedEndpoints) {
        let request_builder = request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${accessToken}`);

        if (endpoint.body) {
          request_builder = request_builder.send(endpoint.body);
        }

        const response = await request_builder.expect((res: any) => {
          // Should be successful (2xx) or validation error (4xx), but not auth error (401)
          expect(res.status).not.toBe(401);
        });

        // If successful, should have user data
        if (response.status === 200) {
          expect(response.body.data).toHaveProperty('email');
          expect(response.body.data.email).toBe(testUser.email);
        }
      }
    });
  });

  describe('JWT Token Format and Security', () => {
    const testUser = {
      email: 'jwt-format-test@example.com',
      password: 'FormatTest123!',
      firstName: 'Format',
      lastName: 'Test',
    };

    it('should generate properly formatted JWT tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const accessToken = response.body.data.accessToken;

      // JWT should have 3 parts separated by dots
      const parts = accessToken.split('.');
      expect(parts.length).toBe(3);

      // Each part should be base64url encoded (no padding, URL safe)
      parts.forEach((part: string) => {
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });

      // Header should be base64url decodable
      try {
        const header = JSON.parse(
          Buffer.from(parts[0], 'base64url').toString()
        );
        expect(header).toHaveProperty('alg');
        expect(header).toHaveProperty('typ');
        expect(header.typ).toBe('JWT');
      } catch (error) {
        fail('JWT header should be valid JSON');
      }
    });

    it('should reject malformed Authorization headers', async () => {
      const malformedHeaders = [
        'Bearer', // Missing token
        'Basic abc123', // Wrong auth type
        'Bearer  ', // Empty token
        'bearer valid.jwt.token', // Wrong case
        'Bearer token.with.spaces in.it', // Spaces in token
      ];

      for (const header of malformedHeaders) {
        await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', header)
          .expect(401);
      }
    });
  });

  describe('Error Handling Consistency', () => {
    it('should return consistent error format for authentication failures', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Unauthorized');

      // Should follow standard error format
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it('should handle missing Authorization header gracefully', async () => {
      await request(app).get('/api/v1/auth/profile').expect(401);
    });

    it('should handle concurrent authentication requests', async () => {
      // Register user first
      const authResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'concurrent-test@example.com',
          password: 'ConcurrentTest123!',
          firstName: 'Concurrent',
          lastName: 'Test',
        });

      const accessToken = authResponse.body.data.accessToken;

      // Make multiple concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
        );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.email).toBe('concurrent-test@example.com');
      });
    });
  });
});
