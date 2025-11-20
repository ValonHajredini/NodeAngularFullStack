/**
 * @fileoverview Integration tests for server lifecycle management
 * Tests server startup, shutdown, and graceful termination procedures
 */

import { createServer } from '../helpers/test-server';
import { databaseService } from '../../src/services/database.service';
import express from 'express';
import { Server } from 'http';
import request from 'supertest';

describe('Server Lifecycle Tests', () => {
  describe('Server Startup', () => {
    let app: express.Application;
    let server: Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should start server successfully with all dependencies', async () => {
      const result = await createServer();
      app = result.app;
      server = result.server;

      expect(app).toBeDefined();
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
    });

    it('should initialize database connection on startup', async () => {
      const dbSpy = jest.spyOn(databaseService, 'initialize');

      const result = await createServer();
      app = result.app;
      server = result.server;

      expect(dbSpy).toHaveBeenCalled();

      dbSpy.mockRestore();
    });

    it('should be ready to accept requests immediately after startup', async () => {
      const result = await createServer();
      app = result.app;
      server = result.server;

      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should handle startup errors gracefully', async () => {
      // Mock database initialization to fail
      const originalInitialize = databaseService.initialize;
      databaseService.initialize = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        await expect(createServer()).rejects.toThrow('Database connection failed');
      } finally {
        databaseService.initialize = originalInitialize;
      }
    });

    it('should start on configured port', async () => {
      const testPort = 3001;
      process.env.PORT = testPort.toString();

      const result = await createServer();
      app = result.app;
      server = result.server;

      const address = server.address();
      expect(address).toBeTruthy();
      if (address && typeof address === 'object') {
        expect(address.port).toBe(testPort);
      }

      // Reset to default port
      process.env.PORT = '3000';
    });
  });

  describe('Server Shutdown', () => {
    let app: express.Application;
    let server: Server;

    beforeEach(async () => {
      const result = await createServer();
      app = result.app;
      server = result.server;
    });

    it('should shutdown gracefully when receiving SIGTERM', async () => {
      const shutdownPromise = new Promise<void>((resolve) => {
        server.on('close', () => resolve());
      });

      // Simulate SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM');

      await shutdownPromise;
      expect(server.listening).toBe(false);
    });

    it('should shutdown gracefully when receiving SIGINT', async () => {
      const shutdownPromise = new Promise<void>((resolve) => {
        server.on('close', () => resolve());
      });

      // Simulate SIGINT signal (Ctrl+C)
      process.emit('SIGINT', 'SIGINT');

      await shutdownPromise;
      expect(server.listening).toBe(false);
    });

    it('should close database connections during shutdown', async () => {
      const dbService = databaseService;
      const closeSpy = jest.spyOn(dbService, 'close');

      const shutdownPromise = new Promise<void>((resolve) => {
        server.on('close', () => resolve());
      });

      process.emit('SIGTERM', 'SIGTERM');
      await shutdownPromise;

      expect(closeSpy).toHaveBeenCalled();
      closeSpy.mockRestore();
    });

    it('should reject new connections during shutdown', async () => {
      // Start shutdown process
      const shutdownPromise = new Promise<void>((resolve) => {
        server.on('close', () => resolve());
      });

      process.emit('SIGTERM', 'SIGTERM');

      // Try to make a request during shutdown
      try {
        await request(app)
          .get('/api/v1/health')
          .timeout(1000);
      } catch (error) {
        // Request should fail during shutdown
        expect(error).toBeDefined();
      }

      await shutdownPromise;
    });

    it('should complete existing requests before shutdown', async () => {
      // Create a slow endpoint for testing
      app.get('/slow-endpoint', (req, res) => {
        setTimeout(() => {
          res.json({ message: 'Completed' });
        }, 2000);
      });

      // Start a request
      const requestPromise = request(app)
        .get('/slow-endpoint')
        .expect(200);

      // Start shutdown after a brief delay
      setTimeout(() => {
        process.emit('SIGTERM', 'SIGTERM');
      }, 500);

      // Request should complete despite shutdown
      const response = await requestPromise;
      expect(response.body.message).toBe('Completed');
    }, 10000);

    it('should force shutdown after timeout', async () => {
      // Create an endpoint that never responds
      app.get('/hanging-endpoint', (req, res) => {
        // Never respond to simulate hanging request
      });

      // Start a hanging request
      const requestPromise = request(app)
        .get('/hanging-endpoint')
        .timeout(15000);

      const shutdownPromise = new Promise<void>((resolve) => {
        server.on('close', () => resolve());
      });

      // Trigger shutdown
      process.emit('SIGTERM', 'SIGTERM');

      // Server should shutdown even with hanging request
      await Promise.race([
        shutdownPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), 12000)
        )
      ]);

      expect(server.listening).toBe(false);

      // Clean up hanging request
      requestPromise.catch(() => {}); // Ignore errors from hanging request
    }, 15000);
  });

  describe('Server Health During Lifecycle', () => {
    let app: express.Application;
    let server: Server;

    beforeEach(async () => {
      const result = await createServer();
      app = result.app;
      server = result.server;
    });

    afterEach(async () => {
      if (server && server.listening) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should report healthy status when fully operational', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
    });

    it('should report readiness status correctly', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.checks.database).toBe('healthy');
    });

    it('should report liveness status correctly', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should handle database connection loss gracefully', async () => {
      // Mock database to simulate connection loss
      const dbService = databaseService;
      const originalQuery = dbService.query.bind(dbService);

      dbService.query = jest.fn().mockRejectedValue(new Error('Connection lost'));

      const response = await request(app)
        .get('/api/v1/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('disconnected');

      // Restore original method
      dbService.query = originalQuery;
    });
  });

  describe('Error Recovery', () => {
    let app: express.Application;
    let server: Server;

    beforeEach(async () => {
      const result = await createServer();
      app = result.app;
      server = result.server;
    });

    afterEach(async () => {
      if (server && server.listening) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should recover from temporary database connection issues', async () => {
      const dbService = databaseService;
      const originalQuery = dbService.query.bind(dbService);

      let callCount = 0;
      dbService.query = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Temporary connection error');
        }
        return originalQuery('SELECT 1');
      });

      // First calls should fail
      await request(app)
        .get('/api/v1/health')
        .expect(503);

      await request(app)
        .get('/api/v1/health')
        .expect(503);

      // Third call should succeed (simulating recovery)
      await request(app)
        .get('/api/v1/health')
        .expect(200);

      // Restore original method
      dbService.query = originalQuery;
    });

    it('should handle uncaught exceptions without crashing', async () => {
      // Create endpoint that throws uncaught exception
      app.get('/uncaught-error', (req, res) => {
        setTimeout(() => {
          throw new Error('Uncaught exception');
        }, 10);
        res.json({ message: 'Request sent' });
      });

      // Server should still be responsive after uncaught exception
      await request(app)
        .get('/uncaught-error')
        .expect(200);

      // Wait a bit for the uncaught exception
      await new Promise(resolve => setTimeout(resolve, 50));

      // Server should still be operational
      await request(app)
        .get('/api/v1/health')
        .expect(200);
    });
  });
});