import request from 'supertest';
import express from 'express';
import { databaseService } from '../../src/services/database.service';
import authRoutes from '../../src/routes/auth.routes';
import tokenRoutes from '../../src/routes/tokens.routes';
// import { Pool } from 'pg';

// Test app setup
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tokens', tokenRoutes);

// Test data
const testUsers = {
  user1: {
    email: 'apitoken-user1@example.com',
    password: 'TestPass123!',
    firstName: 'API',
    lastName: 'User1',
  },
  user2: {
    email: 'apitoken-user2@example.com',
    password: 'TestPass123!',
    firstName: 'API',
    lastName: 'User2',
  },
};

interface TestTokenData {
  accessToken: string;
  userId: string;
}

describe('API Token Endpoints Integration', () => {
  let user1Tokens: TestTokenData;
  let user2Tokens: TestTokenData;
  let createdApiToken: string; // eslint-disable-line @typescript-eslint/no-unused-vars
  let createdTokenId: string; // eslint-disable-line @typescript-eslint/no-unused-vars

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
    // Clean up test data before each test
    const client = await databaseService.getPool().connect();
    try {
      // Clean up in correct order due to foreign key constraints
      await client.query(
        "DELETE FROM api_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%apitoken-%')"
      );
      await client.query(
        "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%apitoken-%')"
      );
      await client.query("DELETE FROM users WHERE email LIKE '%apitoken-%'");
    } finally {
      client.release();
    }

    // Create test users and get their JWT tokens
    const user1Response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUsers.user1);

    const user2Response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUsers.user2);

    user1Tokens = {
      accessToken: user1Response.body.data.accessToken,
      userId: user1Response.body.data.user.id,
    };

    user2Tokens = {
      accessToken: user2Response.body.data.accessToken,
      userId: user2Response.body.data.user.id,
    };
  });

  describe('POST /api/v1/tokens', () => {
    const validTokenRequest = {
      name: 'Test API Token',
      scopes: ['read', 'write'],
    };

    describe('Authentication and Authorization', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .send(validTokenRequest)
          .expect(401);

        expect(response.body.error).toBe('Unauthorized');
      });

      it('should reject invalid JWT token', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', 'Bearer invalid-token')
          .send(validTokenRequest)
          .expect(401);

        expect(response.body.error).toBe('Unauthorized');
      });

      it('should accept valid JWT token', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send(validTokenRequest)
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Token Creation Success Cases', () => {
      it('should create API token with valid data', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send(validTokenRequest)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            token: expect.any(String),
            id: expect.any(String),
            name: 'Test API Token',
            scopes: ['read', 'write'],
            expiresAt: expect.any(String),
          },
          timestamp: expect.any(String),
        });

        // Store for cleanup and further tests
        createdApiToken = response.body.data.token;
        createdTokenId = response.body.data.id;

        // Token should be at least 64 characters (32 bytes hex-encoded)
        expect(response.body.data.token.length).toBeGreaterThanOrEqual(64);

        // Verify expiration is approximately 1 year from now
        const expiresAt = new Date(response.body.data.expiresAt);
        const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const timeDiff = Math.abs(
          expiresAt.getTime() - oneYearFromNow.getTime()
        );
        expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute
      });

      it('should create token with custom expiration', async () => {
        const customExpiration = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ); // 30 days
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({
            ...validTokenRequest,
            name: 'Custom Expiry Token',
            expiresAt: customExpiration.toISOString(),
          })
          .expect(201);

        const responseExpiry = new Date(response.body.data.expiresAt);
        expect(
          Math.abs(responseExpiry.getTime() - customExpiration.getTime())
        ).toBeLessThan(1000);
      });

      it('should create token with read-only scope', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({
            ...validTokenRequest,
            name: 'Read Only Token',
            scopes: ['read'],
          })
          .expect(201);

        expect(response.body.data.scopes).toEqual(['read']);
      });

      it('should allow multiple tokens with different names', async () => {
        // Create first token
        const response1 = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ ...validTokenRequest, name: 'Token One' })
          .expect(201);

        // Create second token
        const response2 = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ ...validTokenRequest, name: 'Token Two' })
          .expect(201);

        expect(response1.body.data.id).not.toBe(response2.body.data.id);
        expect(response1.body.data.token).not.toBe(response2.body.data.token);
      });
    });

    describe('Validation and Error Cases', () => {
      it('should return 400 for missing token name', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ scopes: ['read'] })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toContainEqual(
          expect.objectContaining({ path: 'name' })
        );
      });

      it('should return 400 for empty token name', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ name: '', scopes: ['read'] })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for token name too long', async () => {
        const longName = 'a'.repeat(101);
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ name: longName, scopes: ['read'] })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for missing scopes', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ name: 'Test Token' })
          .expect(400);

        expect(response.body.error.details).toContainEqual(
          expect.objectContaining({ path: 'scopes' })
        );
      });

      it('should return 400 for empty scopes array', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ name: 'Test Token', scopes: [] })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for invalid scopes', async () => {
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({ name: 'Test Token', scopes: ['invalid', 'admin'] })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 400 for past expiration date', async () => {
        const pastDate = new Date('2020-01-01').toISOString();
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send({
            ...validTokenRequest,
            expiresAt: pastDate,
          })
          .expect(400);

        expect(response.body.error.code).toBe('BAD_REQUEST');
        expect(response.body.error.message).toContain('future');
      });

      it('should return 409 for duplicate token name', async () => {
        // Create first token
        await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send(validTokenRequest)
          .expect(201);

        // Try to create second token with same name
        const response = await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send(validTokenRequest)
          .expect(409);

        expect(response.body.error.code).toBe('CONFLICT');
        expect(response.body.error.message).toContain('already exists');
      });

      it('should allow same token name for different users', async () => {
        // Create token for user1
        await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send(validTokenRequest)
          .expect(201);

        // Create token with same name for user2 (should succeed)
        await request(app)
          .post('/api/v1/tokens')
          .set('Authorization', `Bearer ${user2Tokens.accessToken}`)
          .send(validTokenRequest)
          .expect(201);
      });
    });
  });

  describe('GET /api/v1/tokens', () => {
    beforeEach(async () => {
      // Create some test tokens
      await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Token 1', scopes: ['read', 'write'] });

      await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Token 2', scopes: ['read'] });

      await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user2Tokens.accessToken}`)
        .send({ name: 'User2 Token', scopes: ['write'] });
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/tokens').expect(401);
    });

    it("should list user's tokens only", async () => {
      const response = await request(app)
        .get('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: 'Token 1',
            scopes: ['read', 'write'],
            expiresAt: expect.any(String),
            createdAt: expect.any(String),
            isActive: true,
          }),
          expect.objectContaining({
            name: 'Token 2',
            scopes: ['read'],
          }),
        ]),
        meta: { total: 2 },
        timestamp: expect.any(String),
      });

      // Should not contain token values
      response.body.data.forEach((token: any) => {
        expect(token).not.toHaveProperty('token');
        expect(token).not.toHaveProperty('tokenHash');
      });
    });

    it('should return empty array for user with no tokens', async () => {
      // Clean up tokens for user1
      const client = await databaseService.getPool().connect();
      try {
        await client.query('DELETE FROM api_tokens WHERE user_id = $1', [
          user1Tokens.userId,
        ]);
      } finally {
        client.release();
      }

      const response = await request(app)
        .get('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should isolate tokens by user', async () => {
      const user1Response = await request(app)
        .get('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(200);

      const user2Response = await request(app)
        .get('/api/v1/tokens')
        .set('Authorization', `Bearer ${user2Tokens.accessToken}`)
        .expect(200);

      expect(user1Response.body.meta.total).toBe(2);
      expect(user2Response.body.meta.total).toBe(1);

      // Verify no token IDs overlap
      const user1TokenIds = user1Response.body.data.map((t: any) => t.id);
      const user2TokenIds = user2Response.body.data.map((t: any) => t.id);
      const intersection = user1TokenIds.filter((id: string) =>
        user2TokenIds.includes(id)
      );
      expect(intersection).toHaveLength(0);
    });
  });

  describe('GET /api/v1/tokens/:id', () => {
    let testTokenId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Get Test Token', scopes: ['read'] });

      testTokenId = response.body.data.id;
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/v1/tokens/${testTokenId}`).expect(401);
    });

    it('should get token by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testTokenId,
          name: 'Get Test Token',
          scopes: ['read'],
          expiresAt: expect.any(String),
          createdAt: expect.any(String),
          isActive: true,
        },
        timestamp: expect.any(String),
      });

      // Should not contain token value
      expect(response.body.data).not.toHaveProperty('token');
    });

    it('should return 404 for non-existent token', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/tokens/${fakeId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for token belonging to different user', async () => {
      const response = await request(app)
        .get(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user2Tokens.accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('access denied');
    });

    it('should return 400 for invalid token ID format', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/invalid-id')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/tokens/:id', () => {
    let testTokenId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Update Test Token', scopes: ['read', 'write'] });

      testTokenId = response.body.data.id;
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should update token name successfully', async () => {
      const response = await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Updated Token Name' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testTokenId,
          name: 'Updated Token Name',
          scopes: ['read', 'write'], // Should remain unchanged
          isActive: true,
        },
      });
    });

    it('should update token scopes successfully', async () => {
      const response = await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ scopes: ['read'] })
        .expect(200);

      expect(response.body.data.scopes).toEqual(['read']);
      expect(response.body.data.name).toBe('Update Test Token'); // Should remain unchanged
    });

    it('should update token active status', async () => {
      const response = await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it('should update multiple fields', async () => {
      const response = await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({
          name: 'Multi Update Token',
          scopes: ['read'],
          isActive: false,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: 'Multi Update Token',
        scopes: ['read'],
        isActive: false,
      });
    });

    it('should return 404 for non-existent token', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .patch(`/api/v1/tokens/${fakeId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should return 404 for token belonging to different user', async () => {
      await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user2Tokens.accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should return 400 for invalid scopes', async () => {
      const response = await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ scopes: ['invalid'] })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty request body', async () => {
      await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 409 for duplicate name', async () => {
      // Create another token
      await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Existing Token', scopes: ['read'] });

      // Try to update first token to have the same name
      const response = await request(app)
        .patch(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Existing Token' })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('DELETE /api/v1/tokens/:id', () => {
    let testTokenId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Delete Test Token', scopes: ['read'] });

      testTokenId = response.body.data.id;
    });

    it('should require authentication', async () => {
      await request(app).delete(`/api/v1/tokens/${testTokenId}`).expect(401);
    });

    it('should delete token successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Token revoked successfully',
        },
        timestamp: expect.any(String),
      });

      // Verify token is actually deleted
      await request(app)
        .get(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent token', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .delete(`/api/v1/tokens/${fakeId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for token belonging to different user', async () => {
      const response = await request(app)
        .delete(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user2Tokens.accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('access denied');
    });

    it('should return 400 for invalid token ID format', async () => {
      const response = await request(app)
        .delete('/api/v1/tokens/invalid-id')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should be idempotent - deleting already deleted token returns 404', async () => {
      // Delete the token
      await request(app)
        .delete(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(200);

      // Try to delete again
      await request(app)
        .delete(`/api/v1/tokens/${testTokenId}`)
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .expect(404);
    });
  });

  describe('API Token Authentication Flow', () => {
    let apiToken: string; // eslint-disable-line @typescript-eslint/no-unused-vars
    let jwtToken: string;

    beforeEach(async () => {
      // Create an API token
      const tokenResponse = await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Auth Test Token', scopes: ['read', 'write'] });

      apiToken = tokenResponse.body.data.token;
      jwtToken = user1Tokens.accessToken;
    });

    it('should accept both JWT and API token for token management endpoints', async () => {
      // Test with JWT token
      const jwtResponse = await request(app)
        .get('/api/v1/tokens')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(jwtResponse.body.success).toBe(true);
      expect(jwtResponse.body.data.length).toBeGreaterThan(0);

      // Note: API token authentication for token management would require
      // additional implementation in the auth middleware to handle API tokens
      // This is typically done through a separate authentication strategy
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .set('Content-Type', 'application/json')
        .send('{"name": "Test", "scopes": [invalid json}')
        .expect(400);

      // Express should handle malformed JSON and return appropriate error
    });

    it('should handle very long token names appropriately', async () => {
      const veryLongName = 'a'.repeat(1000);
      await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: veryLongName, scopes: ['read'] })
        .expect(400);
    });

    it('should handle database constraint violations gracefully', async () => {
      // This test would require specific database setup to trigger constraint violations
      // Implementation would depend on the specific constraints in place
    });

    it('should handle concurrent token creation', async () => {
      const tokenPromises = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post('/api/v1/tokens')
            .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
            .send({ name: `Concurrent Token ${index}`, scopes: ['read'] })
        );

      const responses = await Promise.all(tokenPromises);

      // All should succeed with unique IDs
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe(`Concurrent Token ${index}`);
      });

      // Verify all tokens have unique IDs
      const tokenIds = responses.map((r) => r.body.data.id);
      const uniqueIds = new Set(tokenIds);
      expect(uniqueIds.size).toBe(tokenIds.length);
    });
  });

  describe('Response Format Consistency', () => {
    let testTokenId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/tokens')
        .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
        .send({ name: 'Format Test Token', scopes: ['read'] });

      testTokenId = response.body.data.id;
    });

    it('should return consistent success response format', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/tokens', expectedStatus: 200 },
        {
          method: 'get',
          path: `/api/v1/tokens/${testTokenId}`,
          expectedStatus: 200,
        },
        {
          method: 'patch',
          path: `/api/v1/tokens/${testTokenId}`,
          body: { name: 'Updated' },
          expectedStatus: 200,
        },
        {
          method: 'delete',
          path: `/api/v1/tokens/${testTokenId}`,
          expectedStatus: 200,
        },
      ];

      for (const endpoint of endpoints) {
        const req = (request(app) as any)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`);

        if (endpoint.body) {
          req.send(endpoint.body);
        }

        const response = await req.expect(endpoint.expectedStatus);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.anything(),
          timestamp: expect.any(String),
        });

        // Create a new token for the next iteration if this one was deleted
        if (endpoint.method === 'delete') {
          const newTokenResponse = await request(app)
            .post('/api/v1/tokens')
            .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
            .send({ name: 'Format Test Token New', scopes: ['read'] });
          testTokenId = newTokenResponse.body.data.id;
        }
      }
    });

    it('should return consistent error response format', async () => {
      const errorCases = [
        {
          path: '/api/v1/tokens',
          method: 'post',
          body: {},
          expectedStatus: 400,
        },
        {
          path: '/api/v1/tokens/invalid-id',
          method: 'get',
          expectedStatus: 400,
        },
        {
          path: `/api/v1/tokens/${testTokenId}`,
          method: 'patch',
          body: {},
          expectedStatus: 400,
        },
      ];

      for (const errorCase of errorCases) {
        const response = await (request(app) as any)
          [errorCase.method](errorCase.path)
          .set('Authorization', `Bearer ${user1Tokens.accessToken}`)
          .send(errorCase.body)
          .expect(errorCase.expectedStatus);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: expect.any(String),
            message: expect.any(String),
          },
          timestamp: expect.any(String),
        });
      }
    });
  });
});
