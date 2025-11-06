import request from 'supertest';
import express from 'express';
import healthRoutes from '../../src/routes/health.routes';

// Extend Jest matchers for proper TypeScript support
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveProperty(property: string, value?: any): R;
      toMatchObject(object: Record<string, any>): R;
    }
  }
}

describe('Health Endpoints', () => {
  let app: express.Application;

  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

    app = express();
    app.use(express.json());
    app.use('/', healthRoutes);
  });

  describe('GET /health/liveness', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/liveness')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('GET /health/readiness', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/readiness')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('GET /health', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/healthy|unhealthy/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
        version: '1.0.0',
        services: {
          database: {
            status: expect.stringMatching(/connected|disconnected|error/),
          },
          memory: {
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number),
          },
        },
      });
    });

    it('should include database latency when connected', async () => {
      const response = await request(app)
        .get('/health');

      if (response.body.services.database.status === 'connected') {
        expect(response.body.services.database).toHaveProperty('latency');
        expect(response.body.services.database).toHaveProperty('connections');
      }
    });
  });

  describe('GET /', () => {
    it('should return basic liveness check', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });
});