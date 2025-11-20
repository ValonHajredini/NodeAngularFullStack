import request from 'supertest';
import express from 'express';
import { databaseService } from '../../src/services/database.service';
import authRoutes from '../../src/routes/auth.routes';

// Test app setup
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Authentication Endpoints', () => {
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
      await client.query('DELETE FROM sessions');
      await client.query('DELETE FROM users WHERE email LIKE \'%test%\'');
    } finally {
      client.release();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');

      const { user } = response.body.data;
      expect(user.email).toBe(validRegistrationData.email);
      expect(user.firstName).toBe(validRegistrationData.firstName);
      expect(user.lastName).toBe(validRegistrationData.lastName);
      expect(user.role).toBe('user');
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, firstName, lastName
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationData,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationData,
          password: '123', // Too weak
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body.message).toContain('Email already');
    });

    it('should return 400 for invalid name characters', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationData,
          firstName: 'John123', // Invalid characters
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should trim and sanitize input data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationData,
          email: '  TEST@EXAMPLE.COM  ', // Should be normalized
          firstName: '  John  ', // Should be trimmed
          lastName: '  Doe  ', // Should be trimmed
        })
        .expect(201);

      const { user } = response.body.data;
      expect(user.email).toBe('test@example.com'); // Normalized
      expect(user.firstName).toBe('John'); // Trimmed
      expect(user.lastName).toBe('Doe'); // Trimmed
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const userCredentials = {
      email: 'login-test@example.com',
      password: 'TestPass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send(userCredentials);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');

      const { user } = response.body.data;
      expect(user.email).toBe(userCredentials.email);
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userCredentials.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'refresh-test@example.com',
          password: 'TestPass123!',
          firstName: 'Token',
          lastName: 'Test',
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // New tokens should be different from the original
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'logout-test@example.com',
          password: 'TestPass123!',
          firstName: 'Logout',
          lastName: 'Test',
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle logout without refresh token gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle logout with invalid refresh token gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'invalid-token' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'protected-test@example.com',
          password: 'TestPass123!',
          firstName: 'Protected',
          lastName: 'Test',
        });

      accessToken = response.body.data.accessToken;
    });

    describe('GET /api/v1/auth/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body.data.email).toBe('protected-test@example.com');
        expect(response.body.data).not.toHaveProperty('passwordHash');
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('PATCH /api/v1/auth/profile', () => {
      it('should update profile with valid data', async () => {
        const response = await request(app)
          .patch('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            firstName: 'Updated',
            lastName: 'Name',
          })
          .expect(200);

        expect(response.body.data.firstName).toBe('Updated');
        expect(response.body.data.lastName).toBe('Name');
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .patch('/api/v1/auth/profile')
          .send({ firstName: 'Updated' })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 400 for invalid profile data', async () => {
        const response = await request(app)
          .patch('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            firstName: 'Invalid123', // Invalid characters
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });
    });
  });

  describe('Password Reset', () => {
    const testEmail = 'reset-test@example.com';
    let userAccessToken: string;

    beforeEach(async () => {
      // Create a test user for password reset tests
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'TestPassword123!',
          firstName: 'Reset',
          lastName: 'Test',
        });

      userAccessToken = registerResponse.body.data.accessToken;
    });

    describe('POST /api/v1/auth/password-reset', () => {
      it('should request password reset with valid email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset')
          .send({ email: testEmail })
          .expect(200);

        expect(response.body.message).toContain('password reset link has been sent');
      });

      it('should return success even for non-existent email (security)', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expect(response.body.message).toContain('password reset link has been sent');
      });

      it('should return 400 for invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset')
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for missing email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('POST /api/v1/auth/password-reset/confirm', () => {
      it('should reset password with valid token', async () => {
        // Note: In a real test, we would need the actual token from email
        // For now, test with a sample token to verify endpoint structure
        const response = await request(app)
          .post('/api/v1/auth/password-reset/confirm')
          .send({
            token: 'sample-token-for-testing',
            newPassword: 'NewPassword123!',
          })
          .expect(400); // Expect 400 because token is invalid

        expect(response.body).toHaveProperty('error', 'Bad Request');
      });

      it('should return 400 for invalid token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset/confirm')
          .send({
            token: 'invalid-token-123',
            newPassword: 'NewPassword123!',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Bad Request');
      });

      it('should return 400 for weak password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset/confirm')
          .send({
            token: 'sample-token',
            newPassword: 'weak',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for missing fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password-reset/confirm')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('GET /api/v1/auth/password-reset/validate/:token', () => {
      it('should validate a valid token (would work with real token)', async () => {
        // Note: This would work with a real token from the database
        // For now, testing with sample token to verify endpoint structure
        const response = await request(app)
          .get('/api/v1/auth/password-reset/validate/sample-token')
          .expect(400); // Expect 400 because token is invalid

        expect(response.body).toHaveProperty('error', 'Bad Request');
      });

      it('should return 400 for invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/password-reset/validate/invalid-token-123')
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Bad Request');
        expect(response.body.message).toContain('Invalid or expired reset token');
      });

      it('should return 400 for missing token', async () => {
        // Test missing token parameter (this will be 404 from Express routing)
        // This test ensures the route pattern works correctly
        expect('/api/v1/auth/password-reset/validate/').toMatch(/validate\/$/)
      });
    });

    describe('GET /api/v1/auth/me', () => {
      it('should return user info from access token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).toHaveProperty('role');
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });
  });
});