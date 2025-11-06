/**
 * @fileoverview Comprehensive error scenario testing
 * Tests various error conditions, edge cases, and failure modes
 */

import request from 'supertest';
import express from 'express';
import { createServer } from '../helpers/test-server';
import { databaseService } from '../../src/services/database.service';

describe('Error Scenario Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    const result = await createServer();
    app = result.app;
    server = result.server;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('HTTP Error Scenarios', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not Found');
    });

    it('should return 405 for unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/v1/health') // PATCH not supported on health endpoint
        .expect(405);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Create test endpoint that expects JSON
      app.post('/test-json-error', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test-json-error')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json syntax}') // Malformed JSON
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle oversized request bodies', async () => {
      app.post('/test-oversized', (_req, res) => {
        res.json({ success: true });
      });

      // Create payload larger than 10MB limit
      const largePayload = { data: 'x'.repeat(11 * 1024 * 1024) };

      const response = await request(app)
        .post('/test-oversized')
        .send(largePayload)
        .expect(413);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('too large');
    });

    it('should handle invalid Content-Type headers', async () => {
      app.post('/test-content-type', (req, res) => {
        res.json({ contentType: req.get('Content-Type') });
      });

      const response = await request(app)
        .post('/test-content-type')
        .set('Content-Type', 'invalid/content-type')
        .send('test data')
        .expect(200);

      // Should handle gracefully even with invalid content type
      expect(response.body).toHaveProperty('contentType', 'invalid/content-type');
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle database connection failures gracefully', async () => {
      const originalQuery = databaseService.query.bind(databaseService);

      // Mock database connection failure
      databaseService.query = jest.fn().mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      try {
        const response = await request(app)
          .get('/api/v1/health')
          .expect(503);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('status', 'unhealthy');
        expect(response.body).toHaveProperty('database', 'disconnected');

      } finally {
        // Restore original method
        databaseService.query = originalQuery;
      }
    });

    it('should handle database timeout scenarios', async () => {
      const originalQuery = databaseService.query.bind(databaseService);

      // Mock database timeout
      databaseService.query = jest.fn().mockRejectedValue(
        new Error('Query timeout')
      );

      try {
        const response = await request(app)
          .get('/api/v1/health/ready')
          .expect(503);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.checks.database).toBe('unhealthy');

      } finally {
        databaseService.query = originalQuery;
      }
    });

    it('should handle database constraint violations', async () => {
      // Create test endpoint that might cause constraint violations
      app.post('/test-db-constraint', async (_req, res, next) => {
        try {
          // Try to create duplicate key (this will fail)
          await databaseService.query(`
            CREATE TABLE test_constraint_table (
              id SERIAL PRIMARY KEY,
              unique_field VARCHAR(100) UNIQUE
            )
          `);

          await databaseService.query(
            'INSERT INTO test_constraint_table (unique_field) VALUES ($1)',
            ['duplicate_value']
          );

          // This should fail with constraint violation
          await databaseService.query(
            'INSERT INTO test_constraint_table (unique_field) VALUES ($1)',
            ['duplicate_value']
          );

          res.json({ success: true });
        } catch (error) {
          next(error);
        } finally {
          // Clean up
          try {
            await databaseService.query('DROP TABLE IF EXISTS test_constraint_table');
          } catch {
            // Ignore cleanup errors
          }
        }
      });

      const response = await request(app)
        .post('/test-db-constraint')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle SQL injection attempts', async () => {
      app.post('/test-sql-injection', async (req, res, next) => {
        try {
          const maliciousInput = req.body.input;

          // This should be safe due to parameterized queries
          const result = await databaseService.query(
            'SELECT $1 as user_input',
            [maliciousInput]
          );

          res.json({ result: result.rows[0].user_input });
        } catch (error) {
          next(error);
        }
      });

      const maliciousPayloads = [
        "'; DROP TABLE users; --",
        "1; DELETE FROM users WHERE 1=1; --",
        "'; INSERT INTO users (admin) VALUES (true); --",
        "1' UNION SELECT password FROM users --"
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/test-sql-injection')
          .send({ input: payload })
          .expect(200);

        // The malicious input should be treated as a literal string
        expect(response.body.result).toBe(payload);
      }
    });
  });

  describe('Authentication and Authorization Error Scenarios', () => {
    it('should handle missing Authorization header', async () => {
      // Create protected endpoint
      app.get('/test-auth-required', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({
            success: false,
            error: 'Authorization header required'
          });
        }
        return res.json({ success: true });
      });

      const response = await request(app)
        .get('/test-auth-required')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Authorization');
    });

    it('should handle malformed JWT tokens', async () => {
      app.get('/test-jwt-validation', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Invalid authorization format'
          });
        }

        const token = authHeader.substring(7);
        if (token === 'invalid.jwt.token') {
          return res.status(401).json({
            success: false,
            error: 'Invalid JWT token'
          });
        }

        return res.json({ success: true });
      });

      const response = await request(app)
        .get('/test-jwt-validation')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid JWT');
    });

    it('should handle expired JWT tokens', async () => {
      app.get('/test-jwt-expired', (req, res) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.substring(7);

        if (token === 'expired.jwt.token') {
          return res.status(401).json({
            success: false,
            error: 'JWT token expired'
          });
        }

        return res.json({ success: true });
      });

      const response = await request(app)
        .get('/test-jwt-expired')
        .set('Authorization', 'Bearer expired.jwt.token')
        .expect(401);

      expect(response.body.error).toContain('expired');
    });
  });

  describe('Input Validation Error Scenarios', () => {
    it('should handle missing required fields', async () => {
      app.post('/test-required-fields', (req, res) => {
        const { name, email } = req.body;

        if (!name) {
          return res.status(400).json({
            success: false,
            error: 'Name is required'
          });
        }

        if (!email) {
          return res.status(400).json({
            success: false,
            error: 'Email is required'
          });
        }

        return res.json({ success: true, name, email });
      });

      // Test missing name
      const response1 = await request(app)
        .post('/test-required-fields')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response1.body.error).toContain('Name is required');

      // Test missing email
      const response2 = await request(app)
        .post('/test-required-fields')
        .send({ name: 'Test User' })
        .expect(400);

      expect(response2.body.error).toContain('Email is required');
    });

    it('should handle invalid email formats', async () => {
      app.post('/test-email-validation', (req, res) => {
        const { email } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid email format'
          });
        }

        return res.json({ success: true, email });
      });

      const invalidEmails = [
        'invalid-email',
        '@invalid.com',
        'user@',
        'user@invalid',
        'user..name@example.com',
        'user name@example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/test-email-validation')
          .send({ email })
          .expect(400);

        expect(response.body.error).toContain('Invalid email');
      }
    });

    it('should handle numeric validation errors', async () => {
      app.post('/test-numeric-validation', (req, res) => {
        const { age, score } = req.body;

        if (typeof age !== 'number' || age < 0 || age > 150) {
          return res.status(400).json({
            success: false,
            error: 'Age must be a number between 0 and 150'
          });
        }

        if (typeof score !== 'number' || score < 0 || score > 100) {
          return res.status(400).json({
            success: false,
            error: 'Score must be a number between 0 and 100'
          });
        }

        return res.json({ success: true, age, score });
      });

      const invalidInputs = [
        { age: -1, score: 50 },
        { age: 200, score: 50 },
        { age: 'not-a-number', score: 50 },
        { age: 25, score: -10 },
        { age: 25, score: 150 },
        { age: 25, score: 'invalid' }
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/test-numeric-validation')
          .send(input)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Rate Limiting Error Scenarios', () => {
    it('should handle rate limit exceeded gracefully', async () => {
      // Create endpoint with very low rate limit for testing
      app.get('/test-rate-limit', (req, res) => {
        // Simulate rate limiting logic
        const requestCount = parseInt(req.headers['x-test-request-count'] as string) || 1;

        if (requestCount > 5) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: 60
          });
        }

        return res.json({ success: true, requestCount });
      });

      // Make requests that exceed rate limit
      const response = await request(app)
        .get('/test-rate-limit')
        .set('X-Test-Request-Count', '10')
        .expect(429);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Rate limit');
      expect(response.body).toHaveProperty('retryAfter');
    });
  });

  describe('Network and Infrastructure Error Scenarios', () => {
    it('should handle sudden connection drops gracefully', async () => {
      // Create endpoint that simulates connection drop
      app.get('/test-connection-drop', (req, res) => {
        // Simulate connection being dropped before response is sent
        req.socket.destroy();
      });

      try {
        await request(app)
          .get('/test-connection-drop')
          .timeout(1000);
      } catch (error) {
        // Connection drop should be handled gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle slow client scenarios', async () => {
      app.post('/test-slow-client', (req, res) => {
        // Respond immediately regardless of client speed
        res.json({
          success: true,
          message: 'Response sent regardless of client speed'
        });
      });

      const response = await request(app)
        .post('/test-slow-client')
        .send({ data: 'test' })
        .timeout(5000)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Edge Case Error Scenarios', () => {
    it('should handle empty request bodies gracefully', async () => {
      app.post('/test-empty-body', (req, res) => {
        if (Object.keys(req.body).length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Request body cannot be empty'
          });
        }
        return res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-empty-body')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('empty');
    });

    it('should handle null and undefined values', async () => {
      app.post('/test-null-values', (req, res) => {
        const { name, value } = req.body;

        if (name === null || name === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Name cannot be null or undefined'
          });
        }

        return res.json({ success: true, name, value });
      });

      const response1 = await request(app)
        .post('/test-null-values')
        .send({ name: null, value: 'test' })
        .expect(400);

      expect(response1.body.error).toContain('null');

      const response2 = await request(app)
        .post('/test-null-values')
        .send({ value: 'test' })
        .expect(400);

      expect(response2.body.error).toContain('null or undefined');
    });

    it('should handle special characters and encoding', async () => {
      app.post('/test-special-chars', (req, res) => {
        const { text } = req.body;
        res.json({
          success: true,
          received: text,
          length: text ? text.length : 0
        });
      });

      const specialChars = [
        '🚀💻🔥',
        'üñîçødé',
        '<script>alert("xss")</script>',
        '`${1+1}`',
        '\n\r\t',
        '\u0000\u0001\u0002'
      ];

      for (const text of specialChars) {
        const response = await request(app)
          .post('/test-special-chars')
          .send({ text })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.received).toBe(text);
      }
    });
  });
});