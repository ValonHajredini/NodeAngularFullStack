/**
 * @fileoverview Performance benchmark tests for API endpoints
 * Tests response times, throughput, and scalability characteristics
 */

import request from 'supertest';
import express from 'express';
import { createServer } from '../helpers/test-server';
import { performance } from 'perf_hooks';

describe('API Performance Benchmarks', () => {
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

  describe('Response Time Benchmarks', () => {
    it('should respond to health check within 100ms', async () => {
      const startTime = performance.now();

      await request(app)
        .get('/api/v1/health')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // 100ms threshold
    });

    it('should respond to liveness check within 50ms', async () => {
      const startTime = performance.now();

      await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(50); // 50ms threshold for simple check
    });

    it('should respond to readiness check within 200ms', async () => {
      const startTime = performance.now();

      await request(app)
        .get('/api/v1/health/ready')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200); // 200ms threshold (includes DB check)
    });

    it('should maintain consistent response times under normal load', async () => {
      const responseTimes: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await request(app)
          .get('/api/v1/health')
          .expect(200);

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(avgResponseTime).toBeLessThan(100);
      expect(maxResponseTime).toBeLessThan(200);
      expect(minResponseTime).toBeGreaterThan(0);

      // Check variance (95% of requests should be within 2x of average)
      const acceptableVariance = avgResponseTime * 2;
      const outliers = responseTimes.filter(time => time > acceptableVariance);
      expect(outliers.length).toBeLessThan(iterations * 0.05); // Less than 5% outliers
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(concurrentRequests);

      // All concurrent requests should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // 1 second for 20 concurrent requests

      // Calculate requests per second
      const requestsPerSecond = (concurrentRequests / totalTime) * 1000;
      expect(requestsPerSecond).toBeGreaterThan(20); // At least 20 RPS
    });

    it('should handle sustained load without degradation', async () => {
      const requestsPerBatch = 10;
      const batches = 5;
      const batchResponseTimes: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = performance.now();
        const promises: Promise<any>[] = [];

        for (let i = 0; i < requestsPerBatch; i++) {
          promises.push(
            request(app)
              .get('/api/v1/health')
              .expect(200)
          );
        }

        await Promise.all(promises);
        const batchEndTime = performance.now();
        batchResponseTimes.push(batchEndTime - batchStartTime);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check that performance doesn't degrade over time
      const firstBatchTime = batchResponseTimes[0];
      const lastBatchTime = batchResponseTimes[batchResponseTimes.length - 1];

      // Last batch should not be significantly slower than first
      expect(lastBatchTime).toBeLessThan(firstBatchTime * 1.5);
    }, 10000);

    it('should handle POST requests with JSON payloads efficiently', async () => {
      // Create test endpoint for POST performance testing
      app.post('/test-post-performance', (req, res) => {
        res.json({
          received: req.body,
          timestamp: new Date().toISOString()
        });
      });

      const testPayload = {
        data: 'test data',
        numbers: Array.from({ length: 100 }, (_, i) => i),
        nested: {
          field1: 'value1',
          field2: 'value2',
          array: ['item1', 'item2', 'item3']
        }
      };

      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/test-post-performance')
            .send({ ...testPayload, requestId: i })
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(1000); // 1 second for 10 POST requests

      // Verify responses are correct
      responses.forEach((response, index) => {
        expect(response.body.received.requestId).toBe(index);
        expect(response.body.received.data).toBe('test data');
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have significant memory leaks during sustained requests', async () => {
      const initialMemory = process.memoryUsage();
      const requestCount = 100;

      // Make many requests to check for memory leaks
      for (let i = 0; i < requestCount; i++) {
        await request(app)
          .get('/api/v1/health')
          .expect(200);

        // Force garbage collection periodically if available
        if (global.gc && i % 20 === 0) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();

      // Memory usage shouldn't increase dramatically
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / (1024 * 1024);

      // Allow some growth but not excessive (adjust threshold as needed)
      expect(heapGrowthMB).toBeLessThan(50); // Less than 50MB growth
    }, 15000);

    it('should handle large request payloads within memory limits', async () => {
      app.post('/test-large-payload', (req, res) => {
        const payloadSize = JSON.stringify(req.body).length;
        res.json({
          payloadSize,
          processed: true
        });
      });

      // Create a large but reasonable payload (1MB)
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB string
        metadata: {
          size: '1MB',
          type: 'test'
        }
      };

      const startTime = performance.now();
      const initialMemory = process.memoryUsage();

      const response = await request(app)
        .post('/test-large-payload')
        .send(largePayload)
        .expect(200);

      const endTime = performance.now();
      const finalMemory = process.memoryUsage();

      const processingTime = endTime - startTime;
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(response.body.processed).toBe(true);
      expect(processingTime).toBeLessThan(1000); // Should process within 1 second
      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024); // Less than 10MB memory increase
    });
  });

  describe('Database Performance Impact', () => {
    it('should maintain fast response times with database queries', async () => {
      const dbRequestCount = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < dbRequestCount; i++) {
        const startTime = performance.now();

        await request(app)
          .get('/api/v1/health/ready') // This endpoint checks database
          .expect(200);

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
      expect(maxResponseTime).toBeLessThan(500); // No request over 500ms
    });

    it('should handle concurrent database requests without blocking', async () => {
      const concurrentDbRequests = 15;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentDbRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health/ready')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(concurrentDbRequests);

      // Concurrent database requests should leverage connection pooling
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 15 concurrent DB requests

      // All responses should indicate healthy database
      responses.forEach(response => {
        expect(response.body.checks.database).toBe('healthy');
      });
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle 404 errors quickly', async () => {
      const startTime = performance.now();

      await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(50); // 404s should be very fast
    });

    it('should handle validation errors efficiently', async () => {
      app.post('/test-validation-performance', (req, res) => {
        if (!req.body.required) {
          return res.status(400).json({
            success: false,
            error: 'Required field missing'
          });
        }
        res.json({ success: true });
      });

      const concurrentInvalidRequests = 10;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentInvalidRequests; i++) {
        promises.push(
          request(app)
            .post('/test-validation-performance')
            .send({ invalid: 'data' })
            .expect(400)
        );
      }

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Error handling should be fast
      expect(totalTime).toBeLessThan(500); // 500ms for 10 validation errors
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should apply rate limiting without significant overhead', async () => {
      const requestsWithinLimit = 50; // Well within rate limit
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < requestsWithinLimit; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
            .expect(200)
        );
      }

      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Rate limiting shouldn't add significant overhead for normal requests
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 50 requests
    });
  });
});